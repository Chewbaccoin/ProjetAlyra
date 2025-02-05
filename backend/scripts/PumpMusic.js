// scripts/deploy.js
const hre = require("hardhat");

async function main() {
    console.log("Starting deployment...");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // Deploy MockDAI first (for testnet only)
    console.log("\nDeploying MockDAI...");
    const MockDAI = await ethers.getContractFactory("MockDAI");
    const mockDAI = await MockDAI.deploy();
    await mockDAI.waitForDeployment();
    console.log("MockDAI deployed to:", await mockDAI.getAddress());

    // Mint 10,000,000 DAI to specified address
    console.log("\nMinting 10,000,000 DAI...");
    await mockDAI.mint(
        process.env.PUBLIC_TEST_ADDRESS,
        ethers.parseUnits("10000000", 18)
    );
    console.log("DAI minted successfully");

    // Deploy MockUSDC second (for testnet only)
    console.log("\nDeploying MockUSDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    console.log("MockUSDC deployed to:", await mockUSDC.getAddress());

    // Deploy ArtistSBT
    console.log("\nDeploying ArtistSBT...");
    const ArtistSBT = await ethers.getContractFactory("ArtistSBT");
    const sbt = await ArtistSBT.deploy();
    await sbt.waitForDeployment();
    await sbt.initialize();
    console.log("ArtistSBT deployed to:", await sbt.getAddress());

    // Deploy the Factory with SBT address
    console.log("\nDeploying PumpMusicTokenFactory...");
    const PumpMusicTokenFactory = await ethers.getContractFactory("PumpMusicTokenFactory");
    const factory = await PumpMusicTokenFactory.deploy(await sbt.getAddress());
    await factory.waitForDeployment();
    console.log("PumpMusicTokenFactory deployed to:", await factory.getAddress());

    // Deploy the Swap contract
    console.log("\nDeploying PumpMusicSwap...");
    const PumpMusicSwap = await ethers.getContractFactory("PumpMusicSwap");
    const swap = await PumpMusicSwap.deploy(await mockDAI.getAddress());
    await swap.waitForDeployment();
    console.log("PumpMusicSwap deployed to:", await swap.getAddress());

    // Mint SBT to deployer before creating token
    console.log("\nMinting SBT to deployer...");
    await sbt.verifyArtist(deployer.address);

    // Example token creation
    console.log("\nCreating an example token...");
    const createTokenTx = await factory.createToken(
        "Example Artist Token",
        "EAT",
        100, // 0.001% royalty
        365 * 24 * 60 * 60, // 1 year duration
        ethers.parseUnits("1", 18), // 1 DAI price
        await mockDAI.getAddress()
    );
    const receipt = await createTokenTx.wait();
    
    const tokenCreatedEvent = receipt.logs.find(
        log => log.eventName === 'TokenCreated'
    );
    const tokenAddress = tokenCreatedEvent.args.tokenAddress;
    console.log("Example token deployed to:", tokenAddress);

    // Print deployment summary
    console.log("\nDeployment Summary:");
    console.log("====================");
    console.log("MockDAI:", await mockDAI.getAddress());
    console.log("MockUSDC:", await mockUSDC.getAddress());
    console.log("SBT:", await sbt.getAddress());
    console.log("Factory:", await factory.getAddress());
    console.log("Swap:", await swap.getAddress());
    console.log("Example Token:", tokenAddress);

    // Verify contracts on Basescan
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("\nVerifying contracts on Basescan...");
        
        await hre.run("verify:verify", {
            address: await mockDAI.getAddress(),
            constructorArguments: []
        });

        await hre.run("verify:verify", {
            address: await mockUSDC.getAddress(),
            constructorArguments: []
        });

        await hre.run("verify:verify", {
            address: await sbt.getAddress(),
            constructorArguments: []
        });

        await hre.run("verify:verify", {
            address: await factory.getAddress(),
            constructorArguments: [await sbt.getAddress()]
        });

        await hre.run("verify:verify", {
            address: await swap.getAddress(),
            constructorArguments: [await mockDAI.getAddress()]
        });
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });