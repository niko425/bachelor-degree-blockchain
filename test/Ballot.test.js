const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Ballot", function () {
  let ballot;
  let admin, voter1, voter2, outsider;

  beforeEach(async function () {
    [admin, voter1, voter2, outsider] = await ethers.getSigners();
    const Ballot = await ethers.getContractFactory("Ballot");
    ballot = await Ballot.deploy();
  });

  describe("Deployment", function () {
    it("sets the deployer as admin", async function () {
      expect(await ballot.admin()).to.equal(admin.address);
    });
  });

  describe("addCandidate", function () {
    it("allows admin to add a candidate", async function () {
      await ballot.addCandidate("Alice");
      const candidate = await ballot.candidates(0);
      expect(candidate.name).to.equal("Alice");
      expect(candidate.voteCount).to.equal(0);
      expect(await ballot.candidateCount()).to.equal(1);
    });

    it("rejects a non-admin trying to add a candidate", async function () {
      await expect(
        ballot.connect(outsider).addCandidate("Bob")
      ).to.be.revertedWith("Only admin can perform this action");
    });
  });

  describe("approveVoter", function () {
    it("allows admin to approve a voter", async function () {
      await ballot.approveVoter(voter1.address);
      expect(await ballot.isApprovedVoter(voter1.address)).to.equal(true);
    });

    it("rejects a non-admin trying to approve a voter", async function () {
      await expect(
        ballot.connect(outsider).approveVoter(voter1.address)
      ).to.be.revertedWith("Only admin can perform this action");
    });
  });

  describe("election state", function () {
    it("starts in the Setup state", async function () {
      expect(await ballot.state()).to.equal(0);
    });

    it("rejects starting voting with zero candidates", async function () {
      await expect(ballot.startVoting()).to.be.revertedWith(
        "Add at least one candidate before starting"
      );
    });

    it("rejects adding a candidate once voting has started", async function () {
      await ballot.addCandidate("Alice");
      await ballot.startVoting();
      await expect(ballot.addCandidate("Bob")).to.be.revertedWith(
        "Action not allowed in current election state"
      );
    });

    it("rejects voting before startVoting() is called", async function () {
      await ballot.addCandidate("Alice");
      await ballot.approveVoter(voter1.address);
      await expect(ballot.connect(voter1).vote(0)).to.be.revertedWith(
        "Action not allowed in current election state"
      );
    });

    it("rejects voting after endVoting() is called", async function () {
      await ballot.addCandidate("Alice");
      await ballot.approveVoter(voter1.address);
      await ballot.startVoting();
      await ballot.endVoting();
      await expect(ballot.connect(voter1).vote(0)).to.be.revertedWith(
        "Action not allowed in current election state"
      );
    });

    it("rejects a non-admin trying to start or end voting", async function () {
      await ballot.addCandidate("Alice");
      await expect(ballot.connect(outsider).startVoting()).to.be.revertedWith(
        "Only admin can perform this action"
      );

      await ballot.startVoting();
      await expect(ballot.connect(outsider).endVoting()).to.be.revertedWith(
        "Only admin can perform this action"
      );
    });

    it("rejects ending voting while still in Setup", async function () {
      await expect(ballot.endVoting()).to.be.revertedWith(
        "Action not allowed in current election state"
      );
    });

    it("rejects approving a voter once voting has started", async function () {
      await ballot.addCandidate("Alice");
      await ballot.startVoting();
      await expect(ballot.approveVoter(voter1.address)).to.be.revertedWith(
        "Action not allowed in current election state"
      );
    });

    it("emits StateChanged with the Voting state when voting starts", async function () {
      await ballot.addCandidate("Alice");
      await expect(ballot.startVoting())
        .to.emit(ballot, "StateChanged")
        .withArgs(1);
    });
  });

  describe("vote", function () {
    beforeEach(async function () {
      await ballot.addCandidate("Alice");
      await ballot.addCandidate("Bob");
      await ballot.approveVoter(voter1.address);
      await ballot.startVoting();
    });

    it("allows an approved voter to vote once", async function () {
      await ballot.connect(voter1).vote(0);
      const candidate = await ballot.candidates(0);
      expect(candidate.voteCount).to.equal(1);
      expect(await ballot.hasVoted(voter1.address)).to.equal(true);
    });

    it("rejects an address that was never approved", async function () {
      await expect(
        ballot.connect(outsider).vote(0)
      ).to.be.revertedWith("You are not approved to vote");
    });

    it("prevents the same address from voting twice", async function () {
      await ballot.connect(voter1).vote(0);
      await expect(
        ballot.connect(voter1).vote(1)
      ).to.be.revertedWith("You have already voted");
    });

    it("rejects voting for a candidate ID that doesn't exist", async function () {
      await expect(
        ballot.connect(voter1).vote(99)
      ).to.be.revertedWith("Invalid candidate ID");
    });

    it("emits VoteCast with the voter address and candidate ID", async function () {
      await expect(ballot.connect(voter1).vote(1))
        .to.emit(ballot, "VoteCast")
        .withArgs(voter1.address, 1);
    });
  });

  describe("getResults", function () {
    it("returns every candidate with an accurate vote count", async function () {
      await ballot.addCandidate("Alice");
      await ballot.addCandidate("Bob");
      await ballot.approveVoter(voter1.address);
      await ballot.approveVoter(voter2.address);
      await ballot.startVoting();

      await ballot.connect(voter1).vote(0);
      await ballot.connect(voter2).vote(0);

      const results = await ballot.getResults();
      expect(results.length).to.equal(2);
      expect(results[0].voteCount).to.equal(2);
      expect(results[1].voteCount).to.equal(0);
    });
  });
});
