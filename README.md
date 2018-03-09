# Profede

_Bringing power back to the professional user, with Blockchain_

Professional behavior and data is worth billions to businesses. Why shouldn’t professionals be compensated for this?

## Whitepaper

https://profede.com/profede-whitepaper

## ICO site

https://profede.com/

## Technical definition

ERC20-compliant token, derived from the [MiniMe Token](https://github.com/Giveth/minime) that allows for token cloning (forking).

## Contracts

- [Token.sol](/contracts/Token.sol): Main contract for the token.
- [MiniMeToken.sol](/contracts/MiniMeToken.sol): Token implementation.
- [TokenContribution.sol](/contracts/TokenContribution.sol): Implementation of the initial distribution for the token.
- [TokenPlaceHolder.sol](/contracts/TokenPlaceHolder.sol): Placeholder for the Token before its deployment.
- [ContributionWallet.sol](/contracts/ContributionWallet.sol): Simple contract that will hold all funds until final block of the contribution period.
- [MultiSigWallet.sol](/contracts/MultiSigWallet.sol): ConsenSys multisig used for Token and community multisigs.
- [TeamTokensHolder.sol](/contracts/TeamTokensHolder.sol): Contract where tokens belonging to developers will be held. This contract will release this tokens in a vested timing.

See [INSTRUCTIONS.md](/INSTRUCTIONS.md) for instructions on how to test and deploy the contracts.
