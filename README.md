# alyra
For file: test_voting_code_cyril.js
Main portion of the code tests for one winner and the very end of teh code tests the draw scenario between two proposals.
Two instances are created for solo and duo winners, respectively.
Created two reusable functions "changeWorkflowStatus" and "testVoter" to reduce repetitions in the code. 
- changeWorkflowStatus simply tests any change of state given as parameter,
- testVoter can evaluate any key of the Voter struct given as parameter.
Objects (or dictionaries) stateChangeTx and stateRevertMsg are used in the reusable functions, 
  as a way to provide the minimum amount of parameters when calling those reusables.
Explanations and steps are provided before main functions.

Interesting encounters:
- For loop with "Object" and slice(),
- Dynamic Testing from Mocha, example at line 242 with 'test reverts'
- eval() to turn a string into a function, used in reusable functions.
- line 350 for the tallyVotesDraw function, the test RAN OUT OF GAS. Had to bump the gas up.
