// Simulate a full contribution

const MultiSigWallet = artifacts.require("MultiSigWallet");
const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
const Token = artifacts.require("TokenMock");
const TokenContributionClass = artifacts.require("TokenContributionMock");
const ContributionWallet = artifacts.require("ContributionWallet");
const TeamTokensHolder = artifacts.require("TeamTokensHolderMock");
const ReserveTokensHolder = artifacts.require("ReserveTokensHolderMock");
const BountiesTokensHolder = artifacts.require("BountiesTokensHolderMock");
const TokenPlaceHolderClass = artifacts.require("TokenPlaceHolderMock");

const assertFail = require("./helpers/assertFail");
const BigNumber = require('bignumber.js');

contract("Contribution discounts", function (accounts) {
    const addressToken = accounts[0];
    const addressCommunity = accounts[1];
    const addressReserve = accounts[2];
    const addressBounties = accounts[9];
    const addressTeam = accounts[3];
    const addressDiscounts = accounts[5];

    let multisigToken;
    let multisigCommunity;
    let multisigReserve;
    let multisigBounties;
    let multisigTeam;

    let miniMeTokenFactory;

    let token;

    let tokenContribution;

    let contributionWallet;

    let teamTokensHolder;
    let reserveTokensHolder;
    let bountiesTokensHolder;
    let tokenPlaceHolder;

    const startBlock = 1000000;
    const endBlock = 1040000;

    const maxSupply = new BigNumber('6e9'); // 6 billions in ethers
    const percentToSale = 50; // Percentage of coins for the ico

    const exchangeRate = 10000;

    const totalSupplyWithoutSale = maxSupply.mul(percentToSale).div(100);
    const supplySaleTokens = maxSupply.sub(totalSupplyWithoutSale);

    const supplySaleEthers = (maxSupply.div(exchangeRate)).mul(percentToSale).div(100);

    const firstBonusCapPercent = 20;
    const firstBonusPercent = 1.25;

    const secondBonusCapPercent = 40;
    const secondBonusPercent = 1.20;

    const thirdBonusCapPercent = 60;
    const thirdBonusPercent = 1.15;

    const fourthBonusCapPercent = 80;
    const fourthBonusPercent = 1.05;

    it("Deploys all contracts", async () => {
        multisigToken = await MultiSigWallet.new([addressToken], 1);
        multisigCommunity = await MultiSigWallet.new([addressCommunity], 1);
        multisigReserve = await MultiSigWallet.new([addressReserve], 1);
        multisigBounties = await MultiSigWallet.new([addressBounties], 1);
        multisigTeam = await MultiSigWallet.new([addressTeam], 1);

        miniMeTokenFactory = await MiniMeTokenFactory.new();

        token = await Token.new(miniMeTokenFactory.address);
        tokenContribution = await TokenContributionClass.new();

        contributionWallet = await ContributionWallet.new(
            multisigToken.address,
            endBlock,
            tokenContribution.address);

        teamTokensHolder = await TeamTokensHolder.new(
            multisigTeam.address,
            tokenContribution.address,
            token.address);

        reserveTokensHolder = await ReserveTokensHolder.new(
            multisigReserve.address,
            tokenContribution.address,
            token.address);

        bountiesTokensHolder = await BountiesTokensHolder.new(
            multisigBounties.address,
            tokenContribution.address,
            token.address);

        tokenPlaceHolder = await TokenPlaceHolderClass.new(
            multisigCommunity.address,
            token.address,
            tokenContribution.address);

        await token.changeController(tokenContribution.address);

        await tokenContribution.initialize(
            token.address,
            tokenPlaceHolder.address,

            startBlock,
            endBlock,

            contributionWallet.address,

            reserveTokensHolder.address,
            teamTokensHolder.address,
            bountiesTokensHolder.address);
    });

    it("Checks initial parameters", async function () {
        assert.equal(await token.controller(), tokenContribution.address);
    });

    it("Moves time to start of the ICO and checks sale discounts for early participants", async function () {
        tokenContribution.setTotalNormalCollected(0);

        await tokenContribution.setMockedBlockNumber(1000000);
        await token.setMockedBlockNumber(1000000);

        await token.sendTransaction({
            value: web3.toWei(1),
            gas: 300000,
            gasPrice: "20000000000",
            from: addressDiscounts
        });
        let balanceBountiesWallet = await token.balanceOf(addressDiscounts);
        assert.equal(web3.fromWei(balanceBountiesWallet).toNumber(), exchangeRate * firstBonusPercent);
        let pastBalanceBountiesWallet = web3.fromWei(balanceBountiesWallet).toNumber();

        tokenContribution.setTotalNormalCollected(web3.toWei(supplySaleEthers.mul(firstBonusCapPercent).div(100)));

        await tokenContribution.setMockedBlockNumber(1001000);
        await token.setMockedBlockNumber(1001000);

        await token.sendTransaction({
            value: web3.toWei(1),
            gas: 300000,
            gasPrice: "20000000000",
            from: addressDiscounts
        });
        balanceBountiesWallet = await token.balanceOf(addressDiscounts);
        assert.equal(web3.fromWei(balanceBountiesWallet).toNumber(), pastBalanceBountiesWallet + exchangeRate * secondBonusPercent);
        pastBalanceBountiesWallet = web3.fromWei(balanceBountiesWallet).toNumber();

        tokenContribution.setTotalNormalCollected(web3.toWei(supplySaleEthers.mul(secondBonusCapPercent).div(100)));

        await tokenContribution.setMockedBlockNumber(1002000);
        await token.setMockedBlockNumber(1002000);

        await token.sendTransaction({
            value: web3.toWei(1),
            gas: 300000,
            gasPrice: "20000000000",
            from: addressDiscounts
        });
        balanceBountiesWallet = await token.balanceOf(addressDiscounts);
        assert.equal(web3.fromWei(balanceBountiesWallet).toNumber(), pastBalanceBountiesWallet + exchangeRate * thirdBonusPercent);
        pastBalanceBountiesWallet = web3.fromWei(balanceBountiesWallet).toNumber();

        tokenContribution.setTotalNormalCollected(web3.toWei(supplySaleEthers.mul(thirdBonusCapPercent).div(100)));

        await tokenContribution.setMockedBlockNumber(1003000);
        await token.setMockedBlockNumber(1003000);

        await token.sendTransaction({
            value: web3.toWei(1),
            gas: 300000,
            gasPrice: "20000000000",
            from: addressDiscounts
        });
        balanceBountiesWallet = await token.balanceOf(addressDiscounts);
        assert.equal(web3.fromWei(balanceBountiesWallet).toNumber(), pastBalanceBountiesWallet + exchangeRate * fourthBonusPercent);
        pastBalanceBountiesWallet = web3.fromWei(balanceBountiesWallet).toNumber();

        tokenContribution.setTotalNormalCollected(web3.toWei(supplySaleEthers.mul(fourthBonusCapPercent).div(100)));

        await tokenContribution.setMockedBlockNumber(1004000);
        await token.setMockedBlockNumber(1004000);

        await token.sendTransaction({
            value: web3.toWei(1),
            gas: 300000,
            gasPrice: "20000000000",
            from: addressDiscounts
        });
        balanceBountiesWallet = await token.balanceOf(addressDiscounts);
        assert.equal(web3.fromWei(balanceBountiesWallet).toNumber(), pastBalanceBountiesWallet + exchangeRate);
    });

    it("Pauses and resumes the contribution ", async function () {
        await tokenContribution.setMockedBlockNumber(1005000);
        await token.setMockedBlockNumber(1005000);
        await tokenContribution.pauseContribution();
        await assertFail(async function () {
            await token.sendTransaction({value: web3.toWei(5), gas: 300000, gasPrice: "20000000000"});
        });
        await tokenContribution.resumeContribution();
    });

    it("Finalizes", async () => {
        const tokensIssuedPreFinalize = await tokenContribution.tokensIssued();

        await tokenContribution.setMockedBlockNumber(endBlock + 1);
        await tokenContribution.finalize();

        const currentSupply = totalSupplyWithoutSale.add(web3.fromWei(tokensIssuedPreFinalize));

        const tokensIssued = await tokenContribution.tokensIssued();

        assert.equal(tokensIssued.toNumber(), web3.toWei(currentSupply).toNumber(), 'total supply');

        const balanceTeam = await token.balanceOf(teamTokensHolder.address);
        assert.equal(balanceTeam.toNumber(), web3.toWei(maxSupply).mul(0.05).toNumber(), 'team');

        const balanceReserve = await token.balanceOf(reserveTokensHolder.address);
        assert.equal(balanceReserve.toNumber(), web3.toWei(maxSupply).mul(0.40).toNumber(), 'reserve');

        const balanceBounties = await token.balanceOf(bountiesTokensHolder.address);
        assert.equal(balanceBounties.toNumber(), web3.toWei(maxSupply).mul(0.05).toNumber(), 'bounties');
    });

    it("Moves the Ether to the final multisig", async function () {
        /** Check the balance of the contribution wallet, move all the ether to multisig and check
         * if the transaction is successful comparing both accounts*/
        const preBalanceContribution = web3.eth.getBalance(contributionWallet.address);

        await multisigToken.submitTransaction(
            contributionWallet.address,
            0,
            contributionWallet.contract.withdraw.getData());

        const balanceContribution = await web3.eth.getBalance(contributionWallet.address);
        const balanceMultiSig = await web3.eth.getBalance(multisigToken.address);

        assert.isBelow(Math.abs(web3.fromWei(balanceContribution).toNumber()), 0.00001);
        assert.equal(web3.fromWei(preBalanceContribution).toNumber(), web3.fromWei(balanceMultiSig).toNumber());
    });
});
