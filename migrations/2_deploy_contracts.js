const MultiSigWallet = artifacts.require("MultiSigWallet");
const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
const Token = artifacts.require("Token");
const TokenContribution = artifacts.require("TokenContribution");
const ContributionWallet = artifacts.require("ContributionWallet");
const TeamTokensHolder = artifacts.require("TeamTokensHolder");
const TokenPlaceHolder = artifacts.require("TokenPlaceHolder");
const ReserveTokensHolder = artifacts.require("ReserveTokensHolder");
const BountiesTokensHolder = artifacts.require("BountiesTokensHolder");


// All of these constants need to be configured before deploy
const addressBitcoinSuisse = "0x00349679446C6bfb3232eAfe69e4157FFf98cace";  //address test
const addressMainOwner = "0x00349679446C6bfb3232eAfe69e4157FFf98cace";

const addressesReserve = [
    addressMainOwner
];
const multisigReserveReqs = 1;

const addressesTeam = [
    addressMainOwner
];
const multisigTeamReqs = 1;

const addressesBounties = [
    addressMainOwner
];
const multisigBountiesReqs = 1;

const startBlock = 1941920;
const endBlock = 1942000;


module.exports = async function (deployer, network, accounts) {

    //if (network === "development") return;  // Don't deploy on tests

    console.log("Start migrating: ");

    // MultiSigWallet send
    let multisigReserveFuture = MultiSigWallet.new(addressesReserve, multisigReserveReqs);
    let multisigTeamFuture = MultiSigWallet.new(addressesTeam, multisigTeamReqs);
    let multisigBountiesFuture = MultiSigWallet.new(addressesBounties, multisigBountiesReqs);

    // MiniMeTokenFactory send
    let miniMeTokenFactoryFuture = MiniMeTokenFactory.new();

    // MultiSigWallet wait
    let multisigReserve = await multisigReserveFuture;
    console.log("MultiSigWallet Reserve: " + multisigReserve.address);

    let multisigTeam = await multisigTeamFuture;
    console.log("MultiSigWallet Team: " + multisigTeam.address);

    let multisigBounties = await multisigBountiesFuture;
    console.log("MultiSigWallet Bounties: " + multisigBounties.address);

    // MiniMeTokenFactory wait
    let miniMeTokenFactory = await miniMeTokenFactoryFuture;
    console.log("MiniMeTokenFactory: " + miniMeTokenFactory.address);
    console.log();

    // Token send
    let tokenFuture = Token.new(miniMeTokenFactory.address);

    // Contribution send
    let tokenCrowdsaleFuture = TokenContribution.new();

    // Token wait
    let token = await tokenFuture;
    console.log("Token: " + token.address);

    // Contribution wait
    let tokenContribution = await tokenCrowdsaleFuture;
    console.log("Token contribution: " + tokenContribution.address);
    console.log();

    // Token initialize checkpoints for 0th TX gas savings
    await token.generateTokens('0x0', 1);
    await token.destroyTokens('0x0', 1);

    // Change controller
    await token.changeController(tokenContribution.address);

    // TeamTokensHolder send
    let teamTokensHolderFuture = TeamTokensHolder.new(
        multisigTeam.address,
        tokenContribution.address);

    // ReserveTokensHolder send
    let reserveTokensHolderFuture = ReserveTokensHolder.new(
        multisigReserve.address,
        tokenContribution.address);

    // Bounties send
    let bountiesTokensHolderFuture = BountiesTokensHolder.new(
        multisigBounties.address,
        tokenContribution.address);

    // TeamTokensHolder wait
    let teamTokensHolder = await teamTokensHolderFuture;
    console.log("TeamTokensHolder: " + teamTokensHolder.address);
    console.log();

    // ReserveTokensHolder wait
    let reserveTokensHolder = await reserveTokensHolderFuture;
    console.log("ReserveTokensHolder: " + reserveTokensHolder.address);
    console.log();

    // BountiesTokensHolder wait
    let bountiesTokensHolder = await bountiesTokensHolderFuture;
    console.log("BountiesTokensHolder: " + bountiesTokensHolder.address);
    console.log();

    // TokenPlaceHolder send
    let tokenPlaceHolderFuture = TokenPlaceHolder.new(
        addressMainOwner,
        token.address,
        tokenContribution.address);

    // Token placeholder wait
    let placeHolder = await tokenPlaceHolderFuture;
    console.log("Token placeholder: " + placeHolder.address);
    console.log();

    // Token Contribution initialize send/wait
    await tokenContribution.initialize(
        token.address,
        placeHolder.address,

        startBlock,
        endBlock,

        addressBitcoinSuisse,

        reserveTokensHolder.address,
        teamTokensHolder.address,
        bountiesTokensHolder.address);

    console.log("Token crowdsale initialized! \n");
};
