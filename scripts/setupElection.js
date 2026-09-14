const hre = require("hardhat");

const BALLOT_ADDRESS = "0xA7814EdBdfB9C1BBd73620fb55F93375A403F6E3";

const EXTRA_VOTERS = [
  "0x48DaC90355FDA098E6e73502CA789fA8A91A85A4",
  "0x0B1A2b326975d28Cbd3610a78c26E2Ac1538e80A",
  "0xcEdDd5b7569CE7D9dE1DC10881A35d087128789c",
];

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

  const votersToApprove = [admin.address, ...EXTRA_VOTERS];
  for (const voter of votersToApprove) {
    const tx = await ballot.approveVoter(voter);
    await tx.wait();
    console.log("Approved voter:", voter);
  }

  const startTx = await ballot.startVoting();
  await startTx.wait();
  console.log("Voting is now open.");

  const voteTx = await ballot.vote(0);
  await voteTx.wait();
  console.log("Admin voted for Candidate A.");
  console.log("Now vote manually as Voter1, Voter3, and Voter4 in the browser.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});