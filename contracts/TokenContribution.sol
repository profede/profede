pragma solidity ^0.4.18;


import "./Owned.sol";
import "./MiniMeToken.sol";
import "./SafeMath.sol";
import "./ERC20Token.sol";
import "./Bonus.sol";


contract TokenContribution is Owned, TokenController {
    using SafeMath for uint256;

    uint256 constant public maxSupply = 6000000000 ether;

    uint256 constant public exchangeRate = 10000;

    uint256 constant public percentageToSale = 50;

    // Half of the max supply. 50% for ico
    uint256 constant public saleLimit = ((maxSupply / exchangeRate) * percentageToSale / 100);

    uint256 constant public maxGuaranteedLimit = 30000 ether;
    uint256 constant public guaranteedPercent = 27;

    uint256 constant public maxGasPrice = 50000000000;

    uint256 constant public maxCallFrequency = 100;

    MiniMeToken public Token;

    Bonus public bonusProcessor;

    uint256 public startBlock;
    uint256 public endBlock;

    address public destEthTeam;

    address public destTokensTeam;
    address public destTokensReserve;
    address public destTokensBounties;

    address public tokenController;

    mapping(address => uint256) public guaranteedBuyersLimit;
    mapping(address => uint256) public guaranteedBuyersBought;

    uint256 public totalGuaranteedCollected;
    uint256 public totalNormalCollected;

    uint256 public reservedGuaranteed;

    uint256 public finalizedBlock;
    uint256 public finalizedTime;

    mapping(address => uint256) public lastCallBlock;

    bool public paused;

    modifier initialized() {
        require(address(Token) != 0x0);
        _;
    }

    modifier contributionOpen() {
        require(getBlockNumber() >= startBlock &&
        getBlockNumber() <= endBlock &&
        finalizedBlock == 0 &&
        address(Token) != 0x0);
        _;
    }

    modifier notPaused() {
        require(!paused);
        _;
    }

    function TokenContribution() {
        paused = false;
    }


    /// @notice This method should be called by the owner before the contribution
    ///  period starts This initializes most of the parameters
    /// @param _token Address of the Token contract
    /// @param _tokenController Token controller for the Token that will be transferred after
    ///  the contribution finalizes.
    /// @param _startBlock Block when the contribution period starts
    /// @param _endBlock The last block that the contribution period is active
    /// @param _destEthTeam Destination address where the contribution ether is sent
    /// @param _destTokensReserve Address where the tokens for the reserve are sent
    /// @param _destTokensTeam Address where the tokens for the dev are sent
    /// @param _destTokensBounties Address where the tokens for the dev are sent
    function initialize(
        address _token,
        address _tokenController,
        uint256 _startBlock,
        uint256 _endBlock,
        address _destEthTeam,
        address _destTokensReserve,
        address _destTokensTeam,
        address _destTokensBounties
    ) public onlyOwner {
        // Initialize only once
        require(address(Token) == 0x0);

        Token = MiniMeToken(_token);
        require(Token.totalSupply() == 0);
        require(Token.controller() == address(this));
        require(Token.decimals() == 18);
        // Same amount of decimals as ETH

        require(_tokenController != 0x0);
        tokenController = _tokenController;

        require(_startBlock >= getBlockNumber());
        require(_startBlock < _endBlock);
        startBlock = _startBlock;
        endBlock = _endBlock;

        require(_destEthTeam != 0x0);
        destEthTeam = _destEthTeam;

        require(_destTokensReserve != 0x0);
        destTokensReserve = _destTokensReserve;

        require(_destTokensTeam != 0x0);
        destTokensTeam = _destTokensTeam;

        require(_destTokensBounties != 0x0);
        destTokensBounties = _destTokensBounties;

        bonusProcessor = new Bonus(saleLimit);
    }

    /// @notice Sets the limit for a guaranteed address. All the guaranteed addresses
    ///  will be able to get tokens during the contribution period with his own
    ///  specific limit.
    ///  This method should be called by the owner after the initialization
    ///  and before the contribution starts.
    /// @param _th Guaranteed address
    /// @param _limit Limit for the guaranteed address.
    function setGuaranteedAddress(address _th, uint256 _limit) public initialized onlyOwner {
        require(getBlockNumber() < startBlock);
        require(_limit > 0 && _limit <= maxGuaranteedLimit);
        guaranteedBuyersLimit[_th] = _limit;
        reservedGuaranteed = reservedGuaranteed + _limit;
        GuaranteedAddress(_th, _limit);
    }

    /// @notice If anybody sends Ether directly to this contract, consider he is
    ///  getting tokens.
    function() public payable notPaused {
        proxyPayment(msg.sender);
    }


    //////////
    // MiniMe Controller functions
    //////////

    /// @notice This method will generally be called by the Token contract to
    ///  acquire tokens. Or directly from third parties that want to acquire tokens in
    ///  behalf of a token holder.
    /// @param _th Token holder where the tokens will be minted.
    function proxyPayment(address _th) public payable notPaused initialized contributionOpen returns (bool) {
        require(_th != 0x0);
        uint256 guaranteedRemaining = guaranteedBuyersLimit[_th].sub(guaranteedBuyersBought[_th]);
        if (guaranteedRemaining > 0) {
            buyGuaranteed(_th);
        }
        else {
            buyNormal(_th);
        }
        return true;
    }

    function onTransfer(address, address, uint256) public returns (bool) {
        return false;
    }

    function onApprove(address, address, uint256) public returns (bool) {
        return false;
    }

    function buyNormal(address _th) internal {
        require(tx.gasprice <= maxGasPrice);

        // Antispam mechanism
        address caller;
        if (msg.sender == address(Token)) {
            caller = _th;
        }
        else {
            caller = msg.sender;
        }

        // Do not allow contracts to game the system
        require(!isContract(caller));

        require(getBlockNumber().sub(lastCallBlock[caller]) >= maxCallFrequency);
        lastCallBlock[caller] = getBlockNumber();

        uint256 toCollect = saleLimit - totalNormalCollected;

        uint256 toFund;
        if (msg.value <= toCollect) {
            toFund = msg.value;
        }
        else {
            toFund = toCollect;
        }

        totalNormalCollected = totalNormalCollected.add(toFund);
        doBuy(_th, toFund, false);
    }

    function buyGuaranteed(address _th) internal {
        uint256 toCollect = guaranteedBuyersLimit[_th];

        uint256 toFund;
        if (guaranteedBuyersBought[_th].add(msg.value) > toCollect) {
            toFund = toCollect.sub(guaranteedBuyersBought[_th]);
        }
        else {
            toFund = msg.value;
        }

        guaranteedBuyersBought[_th] = guaranteedBuyersBought[_th].add(toFund);
        totalGuaranteedCollected = totalGuaranteedCollected.add(toFund);

        doBuy(_th, toFund, true);
    }

    function doBuy(address _th, uint256 _toFund, bool _guaranteed) internal {
        assert(msg.value >= _toFund);
        // Not needed, but double check.
        assert(totalCollected() <= saleLimit);

        if (_toFund > 0) {
            uint256 tokensGenerated = _toFund.mul(exchangeRate);

            if (_guaranteed) {
                tokensGenerated = tokensGenerated.add(tokensGenerated.percent(guaranteedPercent));
            }
            else {
                tokensGenerated = bonusProcessor.tokensToGenerate(totalCollected(), exchangeRate, _toFund);
            }

            assert(Token.generateTokens(_th, tokensGenerated));
            destEthTeam.transfer(_toFund);

            NewSale(_th, _toFund, tokensGenerated, _guaranteed);
        }

        uint256 toReturn = msg.value.sub(_toFund);
        if (toReturn > 0) {
            // If the call comes from the Token controller,
            // then we return it to the token Holder.
            // Otherwise we return to the sender.
            if (msg.sender == address(Token)) {
                _th.transfer(toReturn);
            }
            else {
                msg.sender.transfer(toReturn);
            }
        }
    }

    // NOTE on Percentage format
    // Right now, Solidity does not support decimal numbers. (This will change very soon)
    //  So in this contract we use a representation of a percentage that consist in
    //  expressing the percentage in "x per 10**18"
    // This format has a precision of 16 digits for a percent.
    // Examples:
    //  3%   =   3*(10**16)
    //  100% = 100*(10**16) = 10**18
    //
    // To get a percentage of a value we do it by first multiplying it by the percentage in  (x per 10^18)
    //  and then divide it by 10**18
    //
    //              Y * X(in x per 10**18)
    //  X% of Y = -------------------------
    //               100(in x per 10**18)
    //


    /// @notice This method will can be called by the owner before the contribution period
    ///  end or by anybody after the `endBlock`. This method finalizes the contribution period
    ///  by creating the remaining tokens and transferring the controller to the configured
    ///  controller.
    function finalize() public initialized {
        require(getBlockNumber() >= startBlock);
        require(msg.sender == owner || getBlockNumber() > endBlock);
        require(finalizedBlock == 0);

        finalizedBlock = getBlockNumber();
        finalizedTime = now;

        uint256 percentageToTeam = percent(5);

        uint256 percentageToCommunity = percent(50);

        uint256 percentageToReserve = percent(40);

        uint256 percentageToBounties = percent(5);

        //
        //                    percentageToBounties
        //  bountiesTokens = ----------------------- * maxSupply
        //                      percentage(100)
        //
        assert(Token.generateTokens(
                destTokensBounties,
                maxSupply.mul(percentageToBounties).div(percent(100))));

        //
        //                    percentageToReserve
        //  reserveTokens = ----------------------- * maxSupply
        //                      percentage(100)
        //
        assert(Token.generateTokens(
                destTokensReserve,
                maxSupply.mul(percentageToReserve).div(percent(100))));

        //
        //                   percentageToTeam
        //  teamTokens = ----------------------- * maxSupply
        //                   percentage(100)
        //
        assert(Token.generateTokens(
                destTokensTeam,
                maxSupply.mul(percentageToTeam).div(percent(100))));

        Token.changeController(tokenController);

        Finalized();
    }

    function percent(uint256 p) internal returns (uint256) {
        return p.mul(10 ** 16);
    }

    /// @dev Internal function to determine if an address is a contract
    /// @param _addr The address being queried
    /// @return True if `_addr` is a contract
    function isContract(address _addr) constant internal returns (bool) {
        if (_addr == 0) return false;
        uint256 size;
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);
    }


    //////////
    // Constant functions
    //////////

    /// @return Total tokens issued in weis.
    function tokensIssued() public constant returns (uint256) {
        return Token.totalSupply();
    }

    /// @return Total Ether collected.
    function totalCollected() public constant returns (uint256) {
        return totalNormalCollected.add(totalGuaranteedCollected);
    }


    //////////
    // Testing specific methods
    //////////

    /// @notice This function is overridden by the test Mocks.
    function getBlockNumber() internal constant returns (uint256) {
        return block.number;
    }


    //////////
    // Safety Methods
    //////////

    /// @notice This method can be used by the controller to extract mistakenly
    ///  sent tokens to this contract.
    /// @param _token The address of the token contract that you want to recover
    ///  set to 0 in case you want to extract ether.
    function claimTokens(address _token) public onlyOwner {
        if (Token.controller() == address(this)) {
            Token.claimTokens(_token);
        }
        if (_token == 0x0) {
            owner.transfer(this.balance);
            return;
        }

        ERC20Token token = ERC20Token(_token);
        uint256 balance = token.balanceOf(this);
        token.transfer(owner, balance);
        ClaimedTokens(_token, owner, balance);
    }


    /// @notice Pauses the contribution if there is any issue
    function pauseContribution() onlyOwner {
        paused = true;
    }

    /// @notice Resumes the contribution
    function resumeContribution() onlyOwner {
        paused = false;
    }

    event ClaimedTokens(address indexed _token, address indexed _controller, uint256 _amount);

    event NewSale(address indexed _th, uint256 _amount, uint256 _tokens, bool _guaranteed);

    event GuaranteedAddress(address indexed _th, uint256 _limit);

    event LogValue(uint256 amount);
    event LogValueMessage(string message, uint256 amount);
    event LogValueBoolean(string message, bool value);

    event Finalized();

}
