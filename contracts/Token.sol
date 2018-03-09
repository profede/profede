pragma solidity ^0.4.18;

import "./MiniMeToken.sol";

contract Token is MiniMeToken {
    // @dev Token constructor just parametrizes the MiniMeIrrevocableVestedToken constructor
    function Token(address _tokenFactory)
    MiniMeToken(
        _tokenFactory,
        0x0,            // no parent token
        0,              // no snapshot block number from parent
        "Professional Activity TOken",          // Token name
        18,             // Decimals
        "PATO",          // Symbol
        true            // Enable transfers
    ) {}
}
