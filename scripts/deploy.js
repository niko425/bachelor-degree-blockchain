const hre = require("hardhat");

async function main() {
  console.log("Deploying ElectionFactory contract...");

  const ElectionFactory = await hre.ethers.getContractFactory("ElectionFactory");
  const factory = await ElectionFactory.deploy();

  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log("ElectionFactory deployed to:", address);
  console.log("Owner address:", await factory.owner());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
