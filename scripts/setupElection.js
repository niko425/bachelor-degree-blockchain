const hre = require("hardhat");

// Deployed contract address (see deployment.md). Kept as a separate constant
// here rather than importing frontend/src/contract.js, since that file uses
// ES module `export` syntax and this script runs as CommonJS under Hardhat.
// If you redeploy, update this AND frontend/src/contract.js AND deployment.md.
const BALLOT_ADDRESS = "0x3552B238312fa7E1B1a98b8dF2C0E0aa465698B8";

// One-off admin setup for the deployed contract: add candidates, approve
// voters, and open voting. Run this once per election, not part of the app.
async function main() {
  const [admin] = await hre.ethers.getSigners();
  const ballot = await hre.ethers.getContractAt("Ballot", BALLOT_ADDRESS, admin);

  console.log("Using admin account:", admin.address);

  const candidateNames = ["Alice", "Bob"];
  for (const name of candidateNames) {
    const tx = await ballot.addCandidate(name);
    await tx.wait();
    console.log(`Added candidate: ${name}`);
  }

  // Approve the admin's own wallet as a voter, purely so we have one
  // known-approved address to test vote() with from the frontend.
  const approveTx = await ballot.approveVoter(admin.address);
  await approveTx.wait();
  console.log("Approved voter:", admin.address);

  const startTx = await ballot.startVoting();
  await startTx.wait();
  console.log("Voting is now open.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});