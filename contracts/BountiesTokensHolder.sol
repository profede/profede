pragma solidity ^0.4.18;

/*
    Copyright 2017, Jordi Baylina

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/// @title BountiesTokensHolder Contract
/// @author Jordi Baylina
/// @dev This contract will hold the tokens of the developers.
///  Tokens will not be able to be collected until 3 months after the contribution ends


//  collectable tokens
//   |
//   |
//   |          .______  vestedTokens rect
//   |        . |
//   |      .   |
//   |    .     |
//   +===+======+------------> time
//     Contrib  3 Months
//       End


import "./MiniMeToken.sol";
import "./TokenContribution.sol";
import "./SafeMath.sol";
import "./ERC20Token.sol";


contract BountiesTokensHolder is Owned {
    using SafeMath for uint256;

    uint256 collectedTokens;
    TokenContribution contribution;
    MiniMeToken miniMeToken;

    function BountiesTokensHolder(address _owner, address _contribution, address _miniMeToken) {
        owner = _owner;
        contribution = TokenContribution(_contribution);
        miniMeToken = MiniMeToken(_miniMeToken);
    }

    /// @notice The owner will call this method to extract the tokens
    function collectTokens() public onlyOwner {
        uint256 finalizedTime = contribution.finalizedTime();

        require(collectedTokens == 0 && finalizedTime > 0 && getTime() > finalizedTime.add(months(3)));

        uint256 balance = miniMeToken.balanceOf(address(this));

        collectedTokens = balance;
        assert(miniMeToken.transfer(owner, balance));

        TokensWithdrawn(owner, balance);
    }

    function months(uint256 m) internal returns (uint256) {
        return m.mul(30 days);
    }

    function getTime() internal returns (uint256) {
        return now;
    }


    //////////
    // Safety Methods
    //////////

    /// @notice This method can be used by the controller to extract mistakenly
    ///  sent tokens to this contract.
    /// @param _token The address of the token contract that you want to recover
    ///  set to 0 in case you want to extract ether.
    function claimTokens(address _token) public onlyOwner {
        require(_token != address(miniMeToken));
        if (_token == 0x0) {
            owner.transfer(this.balance);
            return;
        }

        ERC20Token token = ERC20Token(_token);
        uint256 balance = token.balanceOf(this);
        token.transfer(owner, balance);
        ClaimedTokens(_token, owner, balance);
    }

    event ClaimedTokens(address indexed _token, address indexed _controller, uint256 _amount);
    event TokensWithdrawn(address indexed _holder, uint256 _amount);
}
