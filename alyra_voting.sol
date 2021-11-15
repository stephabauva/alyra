// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/access/Ownable.sol";

contract Voting is Ownable{
    mapping(address => Voter) public _whitelist;
    event Whitelisted(address _address);
    
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }
    
    struct Proposal {
        string description;
        uint voteCount;
    }
    
    mapping (uint => Proposal) proposals;
    uint proposalsCount; //used in addProposal() to increment the proposal Id for the event ProposalRegistered(uint proposalId)
    
    address public admin;
    
    constructor() {
        admin = owner();
        // base proposals from initial draft of present contract; just for fun !
            // proposals[0] = Proposal("Macron - Pour une France vaccinee", 0);
            // proposals[1] = Proposal("Le Pen - Il faut revenir a l Ecu", 0);
            // emit ProposalRegistered(0);
            // emit ProposalRegistered(1);
            // proposalsCount += 2;
    }
    
    enum WorkflowStatus {
        RegisteringVoters, // - 0
        ProposalsRegistrationStarted, // - 1
        ProposalsRegistrationEnded, // - 2
        VotingSessionStarted, // - 3
        VotingSessionEnded, // - 4
        VotesTallied // - 5
    }
    
    WorkflowStatus internal status;
    uint winningProposalId;
    
    event VoterRegistered(address voterAddress); 
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event ProposalRegistered(uint proposalId);
    event Voted (address voter, uint proposalId);
    event AllVotesAccounted();
    
    modifier onlyWhitelistees() {
        require(_whitelist[msg.sender].isRegistered == true, "Not on the white list");
        _;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin);
        _;
    }
    
    //function to get a readable version of the status
    function viewStatus() public view returns (string memory _status) {
        // uint statusIndex = uint(status);
        if (uint(WorkflowStatus(status)) == 0) return "0-RegisteringVoters";
        if (uint(WorkflowStatus(status)) == 1) return "1-ProposalsRegistrationStarted";
        if (uint(WorkflowStatus(status)) == 2) return "2-ProposalsRegistrationEnded";
        if (uint(WorkflowStatus(status)) == 3) return "3-VotingSessionStarted";
        if (uint(WorkflowStatus(status)) == 4) return "4-VotingSessionEnded";
        if (uint(WorkflowStatus(status)) == 5) return "5-VotesTallied";
    }
    
    // administrator can automatically update status to the next
    function automaticUpdateStatus() public onlyAdmin  {
        WorkflowStatus lengthOfEnum = type(WorkflowStatus).max; //get length of enum
        require(status < lengthOfEnum); // we can only go forward if we haven't reach the end of enum 
        WorkflowStatus previousStatus = status; 
        uint nextStatus = uint(status) + 1; //increment uint(enum) by one
        WorkflowStatus newStatus = WorkflowStatus(nextStatus);
        status = newStatus;
        emit WorkflowStatusChange(previousStatus, newStatus);
    }
    
    
    function setupWhiteList(address _addr) public onlyAdmin {
        require(status == WorkflowStatus.RegisteringVoters);
        _whitelist[_addr].isRegistered = true;
        emit VoterRegistered(_addr);
    }
    
    function addProposal(string memory _description) public onlyWhitelistees {
        require(status == WorkflowStatus.ProposalsRegistrationStarted);
        proposals[proposalsCount] = Proposal(_description, 0);
        proposalsCount += 1;
        emit ProposalRegistered(proposalsCount);
    }
    
    function addVote(uint _proposalId) public onlyWhitelistees {
        require(status == WorkflowStatus.VotingSessionStarted);
        require(_whitelist[msg.sender].hasVoted == false);
        proposals[_proposalId].voteCount += 1;
        _whitelist[msg.sender].hasVoted = true;
        _whitelist[msg.sender].votedProposalId = _proposalId;
        emit Voted (msg.sender, _proposalId);
    }

    /* 
    Iterate through the mapping of proposals to get the value of each 'voteCount'
    If voteCount's value superior to highestNumberOfVotes, then highestNumberOfVotes is updated of voteCounts's value
    and the id of correspondign proposal is also updated in winningProposalId
    */
    function countVotes() public onlyAdmin {
        require( status == WorkflowStatus.VotingSessionEnded );
        uint highestNumberOfVotes;
        for (uint i=0; i<proposalsCount; i++) {
            if (proposals[i].voteCount > highestNumberOfVotes) {
                highestNumberOfVotes = proposals[i].voteCount;
                winningProposalId = i;
            }
        }
        emit AllVotesAccounted();
    }
    
    function viewWinningProposal() public view returns (uint ID, string memory proposal, uint Nb_of_votes) {
        require( status == WorkflowStatus.VotesTallied );
        Proposal memory winner = proposals[winningProposalId];
        return (winningProposalId, winner.description, winner.voteCount);
    }
    
}
