const hre = require("hardhat");

async function main() {
  console.log("Deploying Ballot contract...");

  const Ballot = await hre.ethers.getContractFactory("Ballot");
  const ballot = await Ballot.deploy();

  await ballot.waitForDeployment();

  const address = await ballot.getAddress();
  console.log("Ballot deployed to:", address);
  console.log("Admin address:", await ballot.admin());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
