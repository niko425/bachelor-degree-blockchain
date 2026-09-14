const hre = require("hardhat");

// Deployed contract address (see deployment.md). Kept as a separate constant
// here rather than importing frontend/src/contract.js, since that file uses
// ES module `export` syntax and this script runs as CommonJS under Hardhat.
// If you redeploy, update this AND frontend/src/contract.js AND deployment.md.
// UPDATE THIS after running deploy.js again for the demo redeploy:
const BALLOT_ADDRESS = "0xA7814EdBdfB9C1BBd73620fb55F93375A403F6E3";

// Additional voter accounts created in MetaMask for the live demo, each
// funded with a little Sepolia ETH so they can pay for their own vote().
const EXTRA_VOTERS = [
  "0x48DaC90355FDA098E6e73502CA789fA8A91A85A4", // Voter1
  "0x0B1A2b326975d28Cbd3610a78c26E2Ac1538e80A", // Voter3
  "0xcEdDd5b7569CE7D9dE1DC10881A35d087128789c", // Voter4
];

// One-off admin setup for the deployed contract: add candidates, approve
// voters, and open voting. Run this once per election, not part of the app.
async function main() {
  const [admin] = await hre.ethers.getSigners();
  const ballot = await hre.ethers.getContractAt("Ballot", BALLOT_ADDRESS, admin);

  console.log("Using admin account:", admin.address);

  const candidateNames = ["Candidate A", "Candidate B", "Candidate C", "Candidate D"];
  for (const name of candidateNames) {
    const tx = await ballot.addCandidate(name);
    await tx.wait();
    console.log(`Added candidate: ${name}`);
  }

  // Approve the admin's own wallet plus the 3 extra demo accounts, so 4
  // different wallets can each cast one real vote during the demo.
  const votersToApprove = [admin.address, ...EXTRA_VOTERS];
  for (const voter of votersToApprove) {
    const tx = await ballot.approveVoter(voter);
    await tx.wait();
    console.log("Approved voter:", voter);
  }

  const startTx = await ballot.startVoting();
  await startTx.wait();
  console.log("Voting is now open.");

  // Admin casts their own vote automatically, since we have this account's
  // key. Voter1/Voter3/Voter4 only exist in MetaMask (by design, their keys
  // were never exported), so those 3 votes must be cast manually in the
  // browser right after this script finishes.
  const voteTx = await ballot.vote(0); // vote for Candidate A
  await voteTx.wait();
  console.log("Admin voted for Candidate A.");
  console.log("Now vote manually as Voter1, Voter3, and Voter4 in the browser.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});