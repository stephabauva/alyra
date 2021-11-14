const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect, assert } = require('chai');
const votingAbstraction = artifacts.require('Voting_cyril');

contract('test_code_cyril_voting', async function(accounts) { 

    const owner = accounts[0];
    const voters = {
        1 : accounts[1],
        2 : accounts[2],
        3 : accounts[3],
        4 : accounts[4],
};
    const stateChangeTx = {
        1: 'votingInstance.startProposalsRegistering({from: owner})',
        2: 'votingInstance.endProposalsRegistering({from: owner})',
        3: 'votingInstance.startVotingSession({from: owner})',
        4: 'votingInstance.endVotingSession({from: owner})',
    };
    const stateRevertMsg = {
        1:'Registering proposals cant be started now',
        2:'Registering proposals havent started yet',
        3:'Registering proposals phase is not finished',
        4:'Voting session havent started yet',
        5:"Current status is not voting session ended"
    };
    const listOfProposals = [
        'NEAR Protocol',
        'Polygon protocol',
        'Solana protocol',
        'Polkadot protocol'
    ];

    let votingInstance;
    let votingInstanceDrawScenario;

    /**
    * The following function expression is a set of reusable tests for state changes
    and thus, will be called to test everytime a state need to be updated
    * STEPS:
        * - call function to change state -> tx, stored in TX as string
        * - check event is emitted
        * - call function again, expect revert since current state is wrong one
    @param {uint} _newStateIndex - The enum index the state should change to.
    @param {string} _newStateName - The enum name the state should change to.
    */
    let changeWorkflowStatus = function (_newStateIndex, _newStateName) {
        describe(`Change state to ${_newStateName}`, function () {
            it('emit the WorkflowStatusChange event', async function () {
                const tx = await eval(stateChangeTx[_newStateIndex]);
                const currentState = Number(await votingInstance.workflowStatus());
                expectEvent(tx, 'WorkflowStatusChange', currentState, _newStateIndex)
            })
        }) //end change state to ..
        describe(`Change state to ${_newStateName} again`, function () {
            it('should revert since workflowStatus is not at the right state', async function () {
                await expectRevert(eval(stateChangeTx[_newStateIndex]), stateRevertMsg[_newStateIndex] )
            })
        }) //end change state to .. again
    }; //end changeWorkflowStatus

    /**
     * The following function expression is a reusable test aiming at evaluating the state of 
     one of the struct Voter's key.
     * @param {address} _voter - the voter account number.
     * @param {string} _key - the struct's key we want to evaluate.
     * @param {boolean} _expectedValue - the state we expect from the above key.
     * Example: testVoter(accounts[1], 'isRegistered', true) will test if voter 1 is registered to vote.
     */
    let testVoter = function (_voter, _key, _expectedValue) {
        describe(`${_key}`, function () {
            it(`should be ${_expectedValue}`, async function () {
                let Voter = await votingInstance.getVoter(_voter, {from: _voter});
                assert.equal(eval(`Voter.${_key}`), _expectedValue, `value of ${_key} is not ${_expectedValue}`)
            })
        })
    }

    before('create an instance of the contract', async function createInstance() {
        votingInstance = await votingAbstraction.new({from: owner});
        votingInstanceDrawScenario = await votingAbstraction.new({from: owner})
    })

    /** 
    * The following function test the addVoter function. 
    * STEPS:
        * - check correct state is 0
        * - register voters
        * - check emit voter registered
        * - check revert by registering same voter
    */
    describe('addVoter()', function _addVoter() {
        describe('Check if correct current state', function testWorkflowStatus() {
            it('workflowStatus should be at 0 = RegisteringVoters', async function () {
                const status = await votingInstance.workflowStatus.call();
                assert.equal(Number(status), 0, 'Votes are not tallied yet')
            })
        }) 
        
        describe('register voters', function () {
            it('should emit the event VoterRegistered everytime', async function () {
                    for (const _voterAddress of Object.values(voters)) {
                        let tx = await votingInstance.addVoter(_voterAddress, {from: owner});
                        await expectEvent(tx, 'VoterRegistered', {voterAddress: _voterAddress});
                }
            })
            it('voter .isRegistered should be true', async function () {
                for (const _voterAddress of Object.values(voters)) {
                    let voter = await votingInstance.getVoter(_voterAddress, {from: _voterAddress});
                    assert.equal(
                        voter.isRegistered, 
                        true, 
                        'voter not registered');
                }
            })
        }) //end register voters
        describe('register same voter',function registerSameVoter() {
            it('should revert since the voter is already registered', async function () {
                await expectRevert(
                    votingInstance.addVoter(voters[1], {from: owner}),
                    'Already registered')
            })
        }) // end register same voter
    }) // end addVoter()

    /**
     * The following function test the addProposal function
     * STEPS:
        * check the current state is correct
        * Dynamically generating tests for reverts:
            * catch revert - Proposals are not allowed yet
            * update state to ProposalsRegistrationStarted
            * catch revert - You're not a voter
            * catch revert - Vous ne pouvez pas ne rien proposer
        * re-call function with _desc from all voters
            * check event emitted
            * check proposal description have correctly been added
     */
    describe('addProposal()', function () {
        it('At this stage the state should be at 0 - RegisteringVoters', async function () {
            expect(Number(await votingInstance.workflowStatus())).to.equal(0, 'wrong state');
        });
        // |::: Dynamic Testing :::|
        describe('test reverts', function () {
            const beforeStateUpdate = [
                {arg1: 'desc', arg2: {from: voters[1]}, expected: 'Proposals are not allowed yet'}
            ];
            const afterStateUpdate = [
                {arg1: 'desc', arg2: {from: owner}, expected: "You're not a voter"},
                {arg1: "" , arg2:{from: voters[1]}, expected: 'Vous ne pouvez pas ne rien proposer'}, 
            ];
            beforeStateUpdate.forEach(({arg1, arg2, expected}) => {
                it(`correctly caught revert: ${expected}`, async function() {
                    try {
                        await votingInstance.addProposal(arg1, arg2);
                    } catch (error) {
                        assert(error, expected)
                    }
                });
            });
            describe('Call startProposalsRegistering()', function () {
                changeWorkflowStatus(
                    1, 
                    'ProposalsRegistrationStarted'
                );
            });
            afterStateUpdate.forEach(({arg1, arg2, expected}) => {
                it(`correctly caught revert: ${expected}`, async function() {
                    try {
                        await votingInstance.addProposal(arg1, arg2);
                    } catch (error) {
                        assert(error, expected)
                    }
                });
            });
        });
        describe('Re-call function WITH description from all voters', function () {
            it('should emit the ProposalRegistered event', async function () {
                for (const voterKey of Object.keys(voters)) {
                    let _proposalID = voterKey - 1;
                    let tx = await votingInstance.addProposal(listOfProposals[_proposalID], {from: voters[voterKey]});
                    expectEvent(tx, 'ProposalRegistered', {proposalId: new BN(_proposalID)}); 
                            //?!! proposalId only works with BN or string but should be uint ???
                };
            });
            it('All proposals have been added correctly', async function () {
                for (const voterKey of Object.keys(voters)) {
                    let _proposalID = voterKey - 1;
                    let _proposal = await votingInstance.getOneProposal(_proposalID, {from: voters[voterKey]});
                    let _desc = _proposal.description;
                    assert(_desc == listOfProposals[_proposalID], `wrong proposal at proposal:${_proposalID}`);
                }
            })
        })//end Re-call function WITH description
    }) // end addProposal()

    /**
     * The following function tests the setVote function.
     * STEPS:
        * - end proposal registration
        * - start voting session
        * - skip test state
        * - skip test .hasVoted is false
        * - dynamically generating tests for reverts:
            * - test with wrong proposal id
                * - should revert - Proposal not found
            * - test with good proposal id but with a non-voter
                * should revert - You're not a voter
        * check that voter .hasVoted is true
            * check event Voted emitted
     */   
    describe('setVote()', function() {
        describe('Call endProposalsRegistering()', function () {
            changeWorkflowStatus(
                2, 
                'ProposalsRegistrationEnded'
            );
        }); 
        describe('Call startVotingSession()', function () {
            changeWorkflowStatus(
                3, 
                'VotingSessionStarted'
            );  
        });
        describe('test voter', function () {
            testVoter(voters[1], 'hasVoted', false)
        });
        describe('set a proper vote', function () {
            it('voteCount has increased & Voted event was emitted', async function () {
                const _getProposal = await votingInstance.getOneProposal(0, {from: voters[1]});
                const _previousVoteCount = _getProposal.voteCount;
                const tx = await votingInstance.setVote(0, {from: voters[1]});
                const _newVoteCount = _getProposal.voteCount;
                expect(_newVoteCount == _previousVoteCount + 1, 'wrong voteCount');
                expectEvent(tx, 'Voted', 0);
            });   
        });
        describe('test voter', function () {
            testVoter(voters[1], 'hasVoted', true)
        });
        // |::: Dynamic Testing :::|
        describe('test reverts', function () {
            const tests = [
                {arg1: 5 ,arg2:{from: voters[1]}, expected: 'Proposal not found'},
                {arg1: 1, arg2: {from: owner}, expected: "You're not a voter"},
                {arg1: 1, arg2: {from: voters[1]}, expected: 'You have already voted'}
            ];
            tests.forEach(({arg1, arg2, expected}) => {
                it(`correctly caught revert: ${expected}`, async function() {
                    try {
                        await votingInstance.setVote(arg1, arg2);
                    } catch (error) {
                        assert(error, expected)
                    }
                });
            });
        });
        describe('add more votes', function () {
            it('more votes added sucessfully', function () {
                Object.values(voters).slice(1).forEach(async function(voterAddress) { //voter 1 has already voted, like [1:] in python
                    await votingInstance.setVote(0, {from: voterAddress});
                    let _voter = await votingInstance.getVoter(voterAddress, {from: voters[1]});
                    assert.equal(_voter.hasVoted, true, `${voterAddress} did not vote`);
                });
            });
        }); //end add more votes
    }); // end setVote()

    /**
     * The following function test the tallyVotes function.
     * STEPS:
     * call from voter
        * should revert - onlyOwner
     * change state
        * check state changed
     *  call from owner
        * should emit the workflowStatusChange event
     * winner should be as expected
     */
    describe('tallyVotes()', function () {
       describe('transaction from voter', function () {
           it('should revert - onlyOwner', async function () {
               await expectRevert(votingInstance.tallyVotes({from: voters[1]}), "Ownable: caller is not the owner")
           })
       })
       describe('transaction startVotingSession()', function () {
            changeWorkflowStatus(
                4, 
                'VotingSessionEnded'
            );  
        })
       describe('transaction from owner', function () {
            it('workflowStatus should be at votingSessionEnded', async function () {
                const _currentState = Number(await votingInstance.workflowStatus());
                    expect(_currentState).to.equal(4, 'wrong state');
            });
            it('state has changed to VotesTallied', async function () {
                const tx = await votingInstance.tallyVotes({from: owner});
                assert.ok(tx);
                const _previousState = Number(await votingInstance.workflowStatus());
                expectEvent(tx, 'WorkflowStatusChange', _previousState, 5);
            })
            it('winner should be proposal 0', async function () {
                const winner = await votingInstance.getWinner();
                expect(winner.description).to.equal("NEAR Protocol")
            })
       }) //end transaction from owner
    })//end tallyVotes()

    /**
     * The following function test the tallyVotesDraw function
     * The code add 2 proposals with 2 votes each.
     */
    describe('tallyVotesDraw()', function () {
        it('the two winners are the ones as expected', async function () {
            //register voters
            for (const _voterAddress of Object.values(voters)) {
                await votingInstanceDrawScenario.addVoter(_voterAddress, {from: owner});
            }
            //update state
            await votingInstanceDrawScenario.startProposalsRegistering({from: owner});
            //add 2 proposals
            for (const voterKey of Object.keys(voters)) {
                let _proposalID;
                let temp = voterKey - 1 + 10;
                if (temp % 2 == 0) {
                    _proposalID = 0;
                } else {
                    _proposalID = 1;
                }
                await votingInstanceDrawScenario.addProposal(listOfProposals[_proposalID], {from: voters[voterKey]});
            };
            //update state
            await votingInstanceDrawScenario.endProposalsRegistering({from: owner});
            //update state
            await votingInstanceDrawScenario.startVotingSession({from: owner});
            //vote
            Object.keys(voters).forEach(async function(voterKey) { 
                let _proposalID;
                let temp = voterKey - 1 + 10;
                if (temp % 2 == 0) {
                    _proposalID = 0;
                } else {
                    _proposalID = 1;
                }
                await votingInstanceDrawScenario.setVote(_proposalID, {from: voters[voterKey]});
            });
            await votingInstanceDrawScenario.endVotingSession({from: owner});
            //count votes
            await votingInstanceDrawScenario.tallyVotesDraw({gas: 2000000, gasPrice: 0,from: owner}); // had to add some gas values or error: out of gas
            //get the two winners
            const winners = await votingInstanceDrawScenario.getWinners();
            expect(winners[0].description, winners[0].voteCount).to.equal('NEAR Protocol','2');
            expect(winners[1].description,winners[1].voteCount).to.equal('Polygon protocol','2');
        });
    });
}); //end contract