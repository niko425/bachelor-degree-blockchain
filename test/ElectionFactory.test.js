const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ElectionFactory", function () {
  let factory;
  let owner, other, voter1;

  beforeEach(async function () {
    [owner, other, voter1] = await ethers.getSigners();
    const ElectionFactory = await ethers.getContractFactory("ElectionFactory");
    factory = await ElectionFactory.deploy();
  });

  describe("Deployment", function () {
    it("sets the deployer as owner", async function () {
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("starts with no elections", async function () {
      expect(await factory.electionCount()).to.equal(0);
      expect(await factory.getElections()).to.deep.equal([]);
    });
  });

  describe("createElection", function () {
    it("allows the owner to create an election", async function () {
      await factory.createElection("Student council");

      expect(await factory.electionCount()).to.equal(1);
      expect((await factory.getElections()).length).to.equal(1);
    });

    it("rejects a non-owner trying to create an election", async function () {
      await expect(
        factory.connect(other).createElection("Student council")
      ).to.be.revertedWith("Only owner can create elections");
    });

    it("rejects an empty title", async function () {
      await expect(factory.createElection("")).to.be.revertedWith(
        "Election title cannot be empty"
      );
    });

    it("returns the address of the new election", async function () {
      const created = await factory.createElection.staticCall("Student council");
      await factory.createElection("Student council");

      expect(await factory.getElections()).to.deep.equal([created]);
    });

    it("emits ElectionCreated with the address, title and index", async function () {
      const created = await factory.createElection.staticCall("Student council");

      await expect(factory.createElection("Student council"))
        .to.emit(factory, "ElectionCreated")
        .withArgs(created, "Student council", 0);
    });

    it("gives the new ballot its title and the factory owner as admin", async function () {
      await factory.createElection("Student council");
      const [address] = await factory.getElections();
      const ballot = await ethers.getContractAt("Ballot", address);

      expect(await ballot.title()).to.equal("Student council");
      expect(await ballot.admin()).to.equal(owner.address);
      expect(await ballot.state()).to.equal(0);
    });

    it("tracks several elections in creation order", async function () {
      await factory.createElection("First election");
      await factory.createElection("Second election");

      const elections = await factory.getElections();
      expect(elections.length).to.equal(2);
      expect(await factory.electionCount()).to.equal(2);

      const first = await ethers.getContractAt("Ballot", elections[0]);
      const second = await ethers.getContractAt("Ballot", elections[1]);
      expect(await first.title()).to.equal("First election");
      expect(await second.title()).to.equal("Second election");
    });

    it("emits the index of each election it creates", async function () {
      await factory.createElection("First election");
      const created = await factory.createElection.staticCall("Second election");

      await expect(factory.createElection("Second election"))
        .to.emit(factory, "ElectionCreated")
        .withArgs(created, "Second election", 1);
    });
  });

  describe("independent elections", function () {
    it("keeps a vote in one election from affecting the other", async function () {
      await factory.createElection("First election");
      await factory.createElection("Second election");

      const [firstAddress, secondAddress] = await factory.getElections();
      const first = await ethers.getContractAt("Ballot", firstAddress);
      const second = await ethers.getContractAt("Ballot", secondAddress);

      for (const election of [first, second]) {
        await election.addCandidate("Alice");
        await election.approveVoter(voter1.address);
        await election.startVoting();
      }

      await first.connect(voter1).vote(0);

      expect(await first.totalVotes()).to.equal(1);
      expect(await second.totalVotes()).to.equal(0);
      expect((await first.candidates(0)).voteCount).to.equal(1);
      expect((await second.candidates(0)).voteCount).to.equal(0);
      expect(await first.hasVoted(voter1.address)).to.equal(true);
      expect(await second.hasVoted(voter1.address)).to.equal(false);
    });
  });
});
