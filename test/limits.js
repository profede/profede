// Check limits

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

contract("Contribution limits", function (accounts) {
    const addressToken = accounts[0];
    const addressCommunity = accounts[1];
    const addressReserve = accounts[2];
    const addressBounties = accounts[9];
    const addressTeam = accounts[3];

    const addressTest1 = accounts[5];
    const addressTest2 = accounts[6];
    const addressTest3 = accounts[7];
    const addressTest4 = accounts[8];

    const addressTestDummy = accounts[10];
    const addressTestDummy2 = accounts[11];

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
    const firstBonusCap = supplySaleEthers.mul(firstBonusCapPercent).div(100);

    const secondBonusCapPercent = 40;
    const secondBonusPercent = 1.20;
    const secondBonusCap = supplySaleEthers.mul(secondBonusCapPercent).div(100);

    const thirdBonusCapPercent = 60;
    const thirdBonusPercent = 1.15;
    const thirdBonusCap = supplySaleEthers.mul(thirdBonusCapPercent).div(100);

    const fourthBonusCapPercent = 80;
    const fourthBonusPercent = 1.05;
    const fourthBonusCap = supplySaleEthers.mul(fourthBonusCapPercent).div(100);

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

    it("Checks that nobody can buy before the sale starts", async function () {
        await assertFail(async function () {
            await token.send(web3.toWei(1));
        });
    });

    it("Pauses and resumes the contribution ", async function () {
        await tokenContribution.setMockedBlockNumber(1000000);
        await token.setMockedBlockNumber(1000000);
        await tokenContribution.pauseContribution();
        await assertFail(async function () {
            await token.sendTransaction({value: web3.toWei(5), gas: 300000, gasPrice: "20000000000"});
        });
        await tokenContribution.resumeContribution();
    });

    it("Checks limits", async function () {
        let currentTotalCollected;

        await tokenContribution.setMockedBlockNumber(1000000);
        await token.setMockedBlockNumber(1000000);

        await token.sendTransaction({value: web3.toWei(1), gas: 300000, from: addressTest1});
        let balanceTest1 = await token.balanceOf(addressTest1);
        assert.equal(web3.fromWei(balanceTest1).toNumber(), exchangeRate * firstBonusPercent);

        await token.sendTransaction({value: web3.toWei(firstBonusCap - 51), gas: 300000, from: addressTestDummy});
        currentTotalCollected = await tokenContribution.totalCollected();
        assert.equal(web3.fromWei(currentTotalCollected).toNumber(), firstBonusCap.sub(50).toNumber());

        await tokenContribution.setMockedBlockNumber(1001000);
        await token.setMockedBlockNumber(1001000);

        await token.sendTransaction({value: web3.toWei(10), gas: 300000, from: addressTest1});
        currentTotalCollected = await tokenContribution.totalCollected();
        assert.equal(web3.fromWei(currentTotalCollected).toNumber(), firstBonusCap.sub(40).toNumber());

        balanceTest1 = await token.balanceOf(addressTest1);
        let balanceCalc = (exchangeRate * firstBonusPercent) + (5 * exchangeRate * firstBonusPercent) + (5 * exchangeRate * firstBonusPercent);
        assert.equal(web3.fromWei(balanceTest1).toNumber(), balanceCalc);

        await token.sendTransaction({value: web3.toWei(250), gas: 300000, from: addressTestDummy});

        await tokenContribution.setMockedBlockNumber(1002000);
        await token.setMockedBlockNumber(1002000);

        currentTotalCollected = await tokenContribution.totalCollected();
        assert.equal(web3.fromWei(currentTotalCollected).toNumber(), firstBonusCap.add(210).toNumber());

        await token.sendTransaction({value: web3.toWei(10), gas: 300000, from: addressTest2});
        let balanceTest2 = await token.balanceOf(addressTest2);
        assert.equal(web3.fromWei(balanceTest2).toNumber(), 10 * exchangeRate * secondBonusPercent);

        currentTotalCollected = await tokenContribution.totalCollected();
        assert.equal(web3.fromWei(currentTotalCollected).toNumber(), firstBonusCap.add(220).toNumber());

        let toNextBonusCap = secondBonusCap - web3.fromWei(currentTotalCollected).toNumber();
        await token.sendTransaction({
            value: web3.toWei((toNextBonusCap / 2) - 5),
            gas: 300000,
            from: addressTestDummy
        });
        await token.sendTransaction({
            value: web3.toWei((toNextBonusCap / 2) - 5),
            gas: 300000,
            from: addressTestDummy2
        });

        await tokenContribution.setMockedBlockNumber(1003000);
        await token.setMockedBlockNumber(1003000);

        currentTotalCollected = await tokenContribution.totalCollected();
        assert.equal(web3.fromWei(currentTotalCollected).toNumber(), secondBonusCap.sub(10).toNumber());

        await token.sendTransaction({value: web3.toWei(20), gas: 300000, from: addressTest2});
        balanceTest2 = await token.balanceOf(addressTest2);
        balanceCalc = (10 * exchangeRate * secondBonusPercent) + (10 * exchangeRate * secondBonusPercent) + (10 * exchangeRate * thirdBonusPercent);
        assert.equal(web3.fromWei(balanceTest2).toNumber(), balanceCalc);

        currentTotalCollected = await tokenContribution.totalCollected();
        assert.equal(web3.fromWei(currentTotalCollected).toNumber(), secondBonusCap.add(10).toNumber());

        await token.sendTransaction({value: web3.toWei(250), gas: 300000, from: addressTestDummy});

        await tokenContribution.setMockedBlockNumber(1004000);
        await token.setMockedBlockNumber(1004000);

        currentTotalCollected = await tokenContribution.totalCollected();
        assert.equal(web3.fromWei(currentTotalCollected).toNumber(), secondBonusCap.add(260).toNumber());

        await token.sendTransaction({value: web3.toWei(8), gas: 300000, from: addressTest3});
        let balanceTest3 = await token.balanceOf(addressTest3);
        assert.equal(web3.fromWei(balanceTest3).toNumber(), 8 * exchangeRate * thirdBonusPercent);

        currentTotalCollected = await tokenContribution.totalCollected();
        assert.equal(web3.fromWei(currentTotalCollected).toNumber(), secondBonusCap.add(268));

        toNextBonusCap = thirdBonusCap - web3.fromWei(currentTotalCollected).toNumber();
        await token.sendTransaction({
            value: web3.toWei(toNextBonusCap - 10),
            gas: 300000,
            from: addressTestDummy
        });

        await tokenContribution.setMockedBlockNumber(1005000);
        await token.setMockedBlockNumber(1005000);

        currentTotalCollected = await tokenContribution.totalCollected();
        assert.equal(web3.fromWei(currentTotalCollected).toNumber(), thirdBonusCap.sub(10).toNumber());

        await token.sendTransaction({value: web3.toWei(20), gas: 300000, from: addressTest3});
        balanceTest3 = await token.balanceOf(addressTest3);
        balanceCalc = (8 * exchangeRate * thirdBonusPercent) + (10 * exchangeRate * thirdBonusPercent) + (10 * exchangeRate * fourthBonusPercent);
        assert.equal(web3.fromWei(balanceTest3).toNumber(), balanceCalc);

        currentTotalCollected = await tokenContribution.totalCollected();
        assert.equal(web3.fromWei(currentTotalCollected).toNumber(), thirdBonusCap.add(10).toNumber());

        await token.sendTransaction({value: web3.toWei(250), gas: 300000, from: addressTestDummy});

        await tokenContribution.setMockedBlockNumber(1006000);
        await token.setMockedBlockNumber(1006000);

        currentTotalCollected = await tokenContribution.totalCollected();
        assert.equal(web3.fromWei(currentTotalCollected).toNumber(), thirdBonusCap.add(260).toNumber());

        await token.sendTransaction({value: web3.toWei(10), gas: 300000, from: addressTest4});
        let balanceTest4 = await token.balanceOf(addressTest4);
        assert.equal(web3.fromWei(balanceTest4).toNumber(), 10 * exchangeRate * fourthBonusPercent);

        currentTotalCollected = await tokenContribution.totalCollected();
        assert.equal(web3.fromWei(currentTotalCollected).toNumber(), thirdBonusCap.add(270).toNumber());

        toNextBonusCap = fourthBonusCap - web3.fromWei(currentTotalCollected).toNumber();
        await token.sendTransaction({value: web3.toWei(toNextBonusCap - 10), gas: 300000, from: addressTestDummy});

        await tokenContribution.setMockedBlockNumber(1007000);
        await token.setMockedBlockNumber(1007000);

        currentTotalCollected = await tokenContribution.totalCollected();
        assert.equal(web3.fromWei(currentTotalCollected).toNumber(), fourthBonusCap.sub(10).toNumber());

        await token.sendTransaction({value: web3.toWei(20), gas: 300000, from: addressTest4});
        balanceTest4 = await token.balanceOf(addressTest4);
        balanceCalc = 10 * exchangeRate * fourthBonusPercent + (10 * exchangeRate * fourthBonusPercent) + (10 * exchangeRate);
        assert.equal(web3.fromWei(balanceTest4).toNumber(), balanceCalc);

        currentTotalCollected = await tokenContribution.totalCollected();
        assert.equal(web3.fromWei(currentTotalCollected).toNumber(), fourthBonusCap.add(10).toNumber());

        await token.sendTransaction({value: web3.toWei(250), gas: 300000, from: addressTestDummy});

        await tokenContribution.setMockedBlockNumber(1008000);
        await token.setMockedBlockNumber(1008000);

        currentTotalCollected = await tokenContribution.totalCollected();
        assert.equal(web3.fromWei(currentTotalCollected).toNumber(), fourthBonusCap.add(260).toNumber());

        await token.sendTransaction({value: web3.toWei(20), gas: 300000, from: addressTest4});
        balanceTest4 = await token.balanceOf(addressTest4);
        balanceCalc = (20 * exchangeRate * fourthBonusPercent) + (30 * exchangeRate);
        assert.equal(web3.fromWei(balanceTest4).toNumber(), balanceCalc);

        currentTotalCollected = await tokenContribution.totalCollected();
        assert.equal(web3.fromWei(currentTotalCollected).toNumber(), fourthBonusCap.add(280).toNumber());
    });
});
