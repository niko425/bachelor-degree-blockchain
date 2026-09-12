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

    // Setup: candidates/voters can be configured, voting not yet open.
    // Voting: roster is locked, approved voters can cast votes.
    // Ended: nothing changes anymore, results are final.
    enum ElectionState { Setup, Voting, Ended }
    ElectionState public state = ElectionState.Setup;

    // Emitted so off-chain clients (e.g. the frontend) can react to changes
    // without polling contract storage.
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event StateChanged(ElectionState newState);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier inState(ElectionState _requiredState) {
        require(state == _requiredState, "Action not allowed in current election state");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function addCandidate(string memory _name) public onlyAdmin inState(ElectionState.Setup) {
        candidates[candidateCount] = Candidate(_name, 0);
        candidateCount++;
    }

    // Admin approves a single wallet address as belonging to one verified voter.
    function approveVoter(address _voter) public onlyAdmin inState(ElectionState.Setup) {
        isApprovedVoter[_voter] = true;
    }

    function startVoting() public onlyAdmin inState(ElectionState.Setup) {
        require(candidateCount > 0, "Add at least one candidate before starting");
        state = ElectionState.Voting;
        emit StateChanged(ElectionState.Voting);
    }

    function endVoting() public onlyAdmin inState(ElectionState.Voting) {
        state = ElectionState.Ended;
        emit StateChanged(ElectionState.Ended);
    }

    function vote(uint256 _candidateId) public inState(ElectionState.Voting) {
        require(isApprovedVoter[msg.sender], "You are not approved to vote");
        require(!hasVoted[msg.sender], "You have already voted");
        require(_candidateId < candidateCount, "Invalid candidate ID");

        hasVoted[msg.sender] = true;
        candidates[_candidateId].voteCount++;
        emit VoteCast(msg.sender, _candidateId);
    }

    function getResults() public view returns (Candidate[] memory) {
        Candidate[] memory results = new Candidate[](candidateCount);
        for (uint256 i = 0; i < candidateCount; i++) {
            results[i] = candidates[i];
        }
        return results;
    }
}
