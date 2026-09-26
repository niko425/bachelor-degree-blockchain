const hre = require("hardhat");

const FACTORY_ADDRESS = "0xdeA2C4b34f3bd46c4BB82a36DDFd22671BC17352";

const DEFAULT_TITLE = "Student council election";

const CANDIDATES = ["Candidate A", "Candidate B", "Candidate C", "Candidate D"];

const EXTRA_VOTERS = [
  "0x48DaC90355FDA098E6e73502CA789fA8A91A85A4",
  "0x0B1A2b326975d28Cbd3610a78c26E2Ac1538e80A",
  "0xcEdDd5b7569CE7D9dE1DC10881A35d087128789c",
];

async function main() {
  const title = process.env.ELECTION_TITLE || DEFAULT_TITLE;
  const [admin] = await hre.ethers.getSigners();
  const factory = await hre.ethers.getContractAt("ElectionFactory", FACTORY_ADDRESS, admin);

  console.log("Using admin account:", admin.address);
  console.log("Factory:", FACTORY_ADDRESS);
  console.log(`Creating election: "${title}"`);

  const createTx = await factory.createElection(title);
  const receipt = await createTx.wait();

  const created = receipt.logs
    .map((log) => {
      try {
        return factory.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed && parsed.name === "ElectionCreated");

  if (!created) {
    throw new Error("ElectionCreated event was not found in the transaction receipt");
  }

  const electionAddress = created.args.election;
  console.log("Election address:", electionAddress);

  const ballot = await hre.ethers.getContractAt("Ballot", electionAddress, admin);

  for (const name of CANDIDATES) {
    const tx = await ballot.addCandidate(name);
    await tx.wait();
    console.log("Added candidate:", name);
  }

  for (const voter of [admin.address, ...EXTRA_VOTERS]) {
    const tx = await ballot.approveVoter(voter);
    await tx.wait();
    console.log("Approved voter:", voter);
  }

  const startTx = await ballot.startVoting();
  await startTx.wait();
  console.log("Voting is now open.");

  console.log("");
  console.log("Summary");
  console.log("  Title:", await ballot.title());
  console.log("  Election address:", electionAddress);
  console.log("  Created in block:", receipt.blockNumber);
  console.log("  Candidates:", (await ballot.candidateCount()).toString());
  console.log("  Approved voters:", (await ballot.approvedVoterCount()).toString());
  console.log("  Votes cast:", (await ballot.totalVotes()).toString());
  console.log("  State (0=Setup, 1=Voting, 2=Ended):", (await ballot.state()).toString());
  console.log("  Open in the app at /election/" + electionAddress);
  console.log("  No votes were cast; cast them from the browser.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
