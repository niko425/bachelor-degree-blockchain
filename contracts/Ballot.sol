// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Ballot {
    // The address allowed to manage the election (set once, at deployment).
    address public admin;

    struct Candidate {
        string name;
        uint256 voteCount;
    }

    // candidateId => Candidate
    mapping(uint256 => Candidate) public candidates;
    uint256 public candidateCount;

    // Addresses approved to vote (whitelist set by admin — answers the
    // "one person, many wallets" problem: admin only approves one wallet
    // per verified voter before the election starts).
    mapping(address => bool) public isApprovedVoter;
    mapping(address => bool) public hasVoted;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function addCandidate(string memory _name) public onlyAdmin {
        candidates[candidateCount] = Candidate(_name, 0);
        candidateCount++;
    }

    // Admin approves a single wallet address as belonging to one verified voter.
    function approveVoter(address _voter) public onlyAdmin {
        isApprovedVoter[_voter] = true;
    }

    function vote(uint256 _candidateId) public {
        require(isApprovedVoter[msg.sender], "You are not approved to vote");
        require(!hasVoted[msg.sender], "You have already voted");
        require(_candidateId < candidateCount, "Invalid candidate ID");

        hasVoted[msg.sender] = true;
        candidates[_candidateId].voteCount++;
    }

    function getResults() public view returns (Candidate[] memory) {
        Candidate[] memory results = new Candidate[](candidateCount);
        for (uint256 i = 0; i < candidateCount; i++) {
            results[i] = candidates[i];
        }
        return results;
    }
}
