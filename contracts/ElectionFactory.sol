// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Ballot.sol";

contract ElectionFactory {
    address public owner;
    address[] private elections;

    event ElectionCreated(address indexed election, string title, uint256 index);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can create elections");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createElection(string calldata _title) public onlyOwner returns (address) {
        require(bytes(_title).length > 0, "Election title cannot be empty");

        Ballot election = new Ballot(_title, msg.sender);
        elections.push(address(election));
        emit ElectionCreated(address(election), _title, elections.length - 1);

        return address(election);
    }

    function getElections() public view returns (address[] memory) {
        return elections;
    }

    function electionCount() public view returns (uint256) {
        return elections.length;
    }
}
