pragma solidity ^0.4.18;

import '../TeamTokensHolder.sol';

// @dev TeamTokensHolderMock mocks current time

contract TeamTokensHolderMock is TeamTokensHolder {

    function TeamTokensHolderMock(address _owner, address _crowdsale, address _token) TeamTokensHolder(_owner, _crowdsale, _token) {}

    function getTime() internal returns (uint256) {
        return mock_date;
    }

    function setMockedTime(uint256 date) public {
        mock_date = date;
    }

    uint256 mock_date = now;
}
