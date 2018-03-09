pragma solidity ^0.4.18;

import "./TokenContribution.sol";


contract ContributionWallet {

    // Public variables
    address public multisig;
    uint256 public endBlock;
    TokenContribution public contribution;

    // @dev Constructor initializes public variables
    // @param _multisig The address of the multisig that will receive the funds
    // @param _endBlock Block after which the multisig can request the funds
    // @param _contribution Address of the TokenContribution contract
    function ContributionWallet(address _multisig, uint256 _endBlock, address _contribution) {
        require(_multisig != 0x0);
        require(_contribution != 0x0);
        require(_endBlock != 0 && _endBlock <= 4000000);
        multisig = _multisig;
        endBlock = _endBlock;
        contribution = TokenContribution(_contribution);
    }

    // @dev Receive all sent funds without any further logic
    function () public payable {}

    // @dev Withdraw function sends all the funds to the wallet if conditions are correct
    function withdraw() public {
        require(msg.sender == multisig);              // Only the multisig can request it
        require(block.number > endBlock ||            // Allow after end block
                contribution.finalizedBlock() != 0);  // Allow when sale is finalized
        multisig.transfer(this.balance);
    }

}
