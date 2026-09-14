// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Ballot {
    address public admin;

    struct Candidate {
        string name;
        uint256 voteCount;
    }

    mapping(uint256 => Candidate) public candidates;
    uint256 public candidateCount;

    mapping(address => bool) public isApprovedVoter;
    mapping(address => bool) public hasVoted;

    enum ElectionState { Setup, Voting, Ended }
    ElectionState public state = ElectionState.Setup;

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
