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

contract("Contribution", function (accounts) {
    const addressToken = accounts[0];
    const addressCommunity = accounts[1];
    const addressReserve = accounts[2];
    const addressBounties = accounts[9];
    const addressTeam = accounts[3];
    const addressTokenHolder = accounts[4];

    const addressGuaranteed0 = accounts[7];
    const addressGuaranteed1 = accounts[8];

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

    const totalSupplyWithoutSale = maxSupply.mul(percentToSale).div(100);

    const exchangeRate = 10000;

    const firstBonusPercent = 1.25;

    const secondBonusCapPercent = 40;
    const secondBonusPercent = 1.20;

    const thirdBonusCapPercent = 60;
    const thirdBonusPercent = 1.15;

    const fourthBonusCapPercent = 80;
    const fourthBonusPercent = 1.5;

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

    it("Checks initial parameters", async () => {
        assert.equal(await token.controller(), tokenContribution.address);
    });

    it("Checks that nobody can buy before the sale starts", async () => {
        await assertFail(async () => {
            await token.send(web3.toWei(1));
        });
    });

    it("Adds 2 guaranteed addresses", async () => {
        await tokenContribution.setGuaranteedAddress(addressGuaranteed0, 120);
        await tokenContribution.setGuaranteedAddress(addressGuaranteed1, 140);
    });

    it("Moves time to start of the ICO, and does the first buy", async () => {
        await tokenContribution.setMockedBlockNumber(1000000);
        await token.setMockedBlockNumber(1000000);

        await token.sendTransaction({
            value: web3.toWei(1),
            gas: 300000,
            gasPrice: "20000000000",
            from: addressToken
        });

        const balance = await token.balanceOf(addressToken);

        assert.equal(web3.fromWei(balance).toNumber(), exchangeRate * firstBonusPercent);
    });

    it("Pauses and resumes the contribution", async () => {
        await tokenContribution.setMockedBlockNumber(1005000);
        await token.setMockedBlockNumber(1005000);
        await tokenContribution.pauseContribution();
        await assertFail(async () => {
            await token.sendTransaction({value: web3.toWei(5), gas: 300000, gasPrice: "20000000000"});
        });
        await tokenContribution.resumeContribution();
    });

    it("Returns the remaining of the last transaction ", async () => {
        const initialBalance = await web3.eth.getBalance(addressToken);
        await token.sendTransaction({value: web3.toWei(5), gas: 300000, gasPrice: "20000000000"});
        const finalBalance = await web3.eth.getBalance(addressToken);

        const spent = web3.fromWei(initialBalance.sub(finalBalance)).toNumber();

        assert.isAbove(spent, 5);
        assert.isBelow(spent, 5.02);

        const totalCollected = await tokenContribution.totalCollected();
        assert.equal(web3.fromWei(totalCollected), 6);

        const balanceContributionWallet = await web3.eth.getBalance(contributionWallet.address);
        assert.equal(web3.fromWei(balanceContributionWallet), 6);
    });

    it("Check sale limit", async () => {
        await tokenContribution.setMockedBlockNumber(1010000);
        await token.setMockedBlockNumber(1010000);

        await token.sendTransaction({
            value: web3.toWei(tokenContribution.totalNormalCollected - 100),
            gas: 300000,
            gasPrice: "20000000000",
            from: addressToken
        });
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

    it("Moves the Ether to the final multisig", async () => {
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

    it("Doesn't allow transfers in the 1 week period", async () => {
        await assertFail(async () => {
            await token.transfer(addressTokenHolder, web3.toWei(1000));
        });
    });

    it("Allows transfers after 1 week period", async () => {
        const t = Math.floor(new Date().getTime() / 1000) + (86400 * 7) + 1000;
        await tokenPlaceHolder.setMockedTime(t);

        await token.transfer(accounts[5], web3.toWei(1000));

        const balance2 = await token.balanceOf(accounts[5]);

        assert.equal(web3.fromWei(balance2).toNumber(), 1000);
    });

    it("Disallows team from transfering before 6 months have past", async () => {
        const t = Math.floor(new Date().getTime() / 1000) + (86400 * 7) + 1000;
        await teamTokensHolder.setMockedTime(t);

        // This function will fail in the multisig
        await multisigTeam.submitTransaction(
            teamTokensHolder.address,
            0,
            teamTokensHolder.contract.collectTokens.getData(),
            {from: addressTeam, gas: 1000000});

        const balance = await token.balanceOf(multisigTeam.address);
        assert.equal(balance, 0);
    });

    it("Allows team to extract 25% after 6 months", async () => {
        const t = (await tokenContribution.finalizedTime()).toNumber() + (86400 * 180) + 1; // 1 second after 6 months
        await teamTokensHolder.setMockedTime(t);

        await multisigTeam.submitTransaction(
            teamTokensHolder.address,
            0,
            teamTokensHolder.contract.collectTokens.getData(),
            {from: addressTeam});

        const balance = await token.balanceOf(multisigTeam.address);

        const calcTokens = maxSupply.mul(0.05).mul(0.25).toNumber();
        const realTokens = web3.fromWei(balance).toNumber();

        // Check that tokens tokens exists
        assert(calcTokens > 0);

        // Check that the difference is small
        // Due to passing 1 second of 6 months the amount extracted is a bit more than 25%
        const difference = maxSupply.mul(0.05).mul(0.001).toNumber();
        assert.isBelow(realTokens - calcTokens, difference);
    });

    it("Allows team to extract 50% after 6 months", async () => {
        const t = (await tokenContribution.finalizedTime()).toNumber() + (86400 * 360); // Some time after 6 months
        await teamTokensHolder.setMockedTime(t);

        await multisigTeam.submitTransaction(
            teamTokensHolder.address,
            0,
            teamTokensHolder.contract.collectTokens.getData(),
            {from: addressTeam});

        const balance = await token.balanceOf(multisigTeam.address);

        const calcTokens = maxSupply.mul(0.05).mul(0.50).toNumber();
        const realTokens = web3.fromWei(balance).toNumber();

        assert.equal(calcTokens, realTokens);
    });

    it("Allows team to extract everything after 24 months", async () => {
        const t = Math.floor(new Date().getTime() / 1000) + (86400 * 360 * 2);
        await teamTokensHolder.setMockedTime(t);

        await multisigTeam.submitTransaction(
            teamTokensHolder.address,
            0,
            teamTokensHolder.contract.collectTokens.getData(),
            {from: addressTeam});

        const balance = await token.balanceOf(multisigTeam.address);

        const calcTokens = maxSupply.mul(0.05).toNumber();
        const realTokens = web3.fromWei(balance).toNumber();

        assert.equal(calcTokens, realTokens);
    });

    it("Disallows transfering from reserve before 12 months have past", async () => {
        const t = Math.floor(new Date().getTime() / 1000) + (86400 * 359);
        await reserveTokensHolder.setMockedTime(t);

        // This function will fail in the multisig
        await multisigReserve.submitTransaction(
            reserveTokensHolder.address,
            0,
            reserveTokensHolder.contract.collectTokens.getData(),
            {from: addressReserve, gas: 1000000});

        const balance = await token.balanceOf(multisigReserve.address);
        assert.equal(balance, 0);
    });

    it("Allow to extract everything from reserve after 12 months", async () => {
        const t = Math.floor(new Date().getTime() / 1000) + (86400 * 360) + 1;
        await reserveTokensHolder.setMockedTime(t);

        await multisigReserve.submitTransaction(
            reserveTokensHolder.address,
            0,
            reserveTokensHolder.contract.collectTokens.getData(),
            {from: addressReserve});

        const balance = await token.balanceOf(multisigReserve.address);

        const calcTokens = maxSupply.mul(0.40).toNumber();
        const realTokens = web3.fromWei(balance).toNumber();

        assert.equal(calcTokens, realTokens);
    });

    it("Disallows transfering from bounties before 3 months have past", async () => {
        const t = (await tokenContribution.finalizedTime()).toNumber() + (86400 * 80);
        await bountiesTokensHolder.setMockedTime(t);

        // This function will fail in the multisig
        await multisigBounties.submitTransaction(
            bountiesTokensHolder.address,
            0,
            bountiesTokensHolder.contract.collectTokens.getData(),
            {from: addressBounties, gas: 1000000});

        const balance = await token.balanceOf(multisigBounties.address);
        assert.equal(balance, 0);
    });

    it("Allow to extract everything from bounties after 3 months", async () => {
        const t = (await tokenContribution.finalizedTime()).toNumber() + (86400 * 100);
        await bountiesTokensHolder.setMockedTime(t);

        await multisigBounties.submitTransaction(
            bountiesTokensHolder.address,
            0,
            bountiesTokensHolder.contract.collectTokens.getData(),
            {from: addressBounties});

        const balance = await token.balanceOf(multisigBounties.address);

        const calcTokens = maxSupply.mul(0.05).toNumber();
        const realTokens = web3.fromWei(balance).toNumber();

        assert.equal(calcTokens, realTokens);
    });

    it("Checks that Token's Controller is upgradeable", async () => {
        await multisigCommunity.submitTransaction(
            tokenPlaceHolder.address,
            0,
            tokenPlaceHolder.contract.changeController.getData(accounts[6]),
            {from: addressCommunity});

        const controller = await token.controller();

        assert.equal(controller, accounts[6]);
    });
});
