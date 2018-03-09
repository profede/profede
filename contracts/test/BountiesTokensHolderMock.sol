pragma solidity ^0.4.18;

import '../BountiesTokensHolder.sol';

// @dev BountiesTokensHolderMock mocks current time

contract BountiesTokensHolderMock is BountiesTokensHolder {

    function BountiesTokensHolderMock(address _owner, address _crowdsale, address _token) BountiesTokensHolder(_owner, _crowdsale, _token) {}

    function getTime() internal returns (uint256) {
        return mock_date;
    }

    function setMockedTime(uint256 date) public {
        mock_date = date;
    }

    uint256 mock_date = now;
}
