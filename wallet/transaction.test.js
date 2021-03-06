const { verifySignature } = require('../util');
const Wallet = require('.');
const Transaction = require('./transaction')
const { REWARD_INPUT, MINING_REWARD } = require('../config');

describe('Transaction', () => {
    let transaction, senderWallet, recipient, amount;

    beforeEach(() => {
        senderWallet = new Wallet({ privateKey: 'e99b2615b87da28752022963f7f225f5f0114244da765b06b941ba7ba28ba121' });
        recipient = 'recipient-public-key';
        amount = 1;
        transaction = new Transaction({ senderWallet, recipient, amount });
    });

    it('has an `id`', () => {
        expect(transaction).toHaveProperty('id');
    });

    describe('outputMap', () => {
        it('has an `outputMap`', () => {
            expect(transaction).toHaveProperty('outputMap');
        });

        it('outputs the amount to recipient', () => {
            expect(transaction.outputMap[recipient]).toEqual(amount);
        });

        it('outputs the remaining balance for `senderWallet`', () => {
            expect(transaction.outputMap[senderWallet.publicKey])
                .toEqual(senderWallet.balance - amount);
        });
    });

    describe('input', () => {
        it('has an input', () => {
            expect(transaction).toHaveProperty('input');
        });

        it('has a `timestamp`', () => {
            expect(transaction.input).toHaveProperty('timestamp');
        });

        it('sends the `amount` to the senderWallet balance', () => {
            expect(transaction.input.amount).toEqual(senderWallet.balance);
        });

        it('sets the address to the senderWallet publickcey', () => {
            expect(transaction.input.address).toEqual(senderWallet.publicKey)
        });

        it('signs the input', () => {
            expect(
                verifySignature({
                    publicKey: senderWallet.publicKey,
                    data: transaction.outputMap,
                    signature: transaction.input.signature
                })
            ).toBe(true)
        });
    });

    describe('validTranasaction', () => {
       let errorMock;

       beforeEach(() => {
           errorMock = jest.fn();

           global.console.error = errorMock;
       }); 

        describe('when the transaction is valid', () => {
            it('returns true', () => {
                expect(Transaction.validTransaction(transaction)).toBe(true);
            });
        });

        describe('when the transaction is invalid', () => {
            describe('and a transaction outputMap is invalid', () => {
                it('returns false', () => {
                    transaction.outputMap[senderWallet.publicKey] = 90809;
                    expect(Transaction.validTransaction(transaction)).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });

            describe('the transactoin input signature is invalid', () => {
                it('returns false', () => {
                    transaction.input.signature = new Wallet().sign('data');
                    expect(Transaction.validTransaction(transaction)).toBe(false); 
                    expect(errorMock).toHaveBeenCalled();
                });
            });
        });
    });

    describe('update()', () => {
        let originalSignature, originalSenderOutput, nextRecipient, nextAmount;
       
        describe('and the amount is invalid', () => {
            it('throws an error', () => {
                expect(() => {
                    transaction.update({
                        senderWallet, amount: 1000, recipient: "xoi"
                    })
                }).toThrow('Amount exceeds balance');
            });
        });
        
        describe('and the amount is valid', () => {
            beforeEach(() => {
                originalSignature = transaction.input.signature;
                originalSenderOutput =  transaction.outputMap[senderWallet.publicKey];
                nextRecipient = 'me';
                nextAmount = 0;
                transaction.update({ senderWallet: senderWallet, recipient: nextRecipient, amount: nextAmount });
            });
    
            it('outputs the amount to the next recipient', () => {
                expect(transaction.outputMap[nextRecipient]).toEqual(nextAmount);
            });
    
            it('substracts the amount from the sender ouput amount', () => {
                expect(transaction.outputMap[senderWallet.publicKey]).toEqual(originalSenderOutput - nextAmount);
            });
    
            it('maintains a total ouput value that matches the input amount', () => {
                expect(Object.values(transaction.outputMap).reduce((total, outputMap) => total + outputMap))
                    .toEqual(transaction.input.amount);
            });
    
            it('re-sign the transaction', () => {
                expect(transaction.input.signature).not.toEqual(originalSignature);
            });
            
            describe('and another update for the same recipient', () => {
                let addedAmount;
                beforeEach(() =>{
                    addedAmount = 1;
                    transaction.update({
                        senderWallet, recipient: nextRecipient, amount: addedAmount
                    });
                });

                it('adds to the recipient', () => {
                    expect(transaction.outputMap[nextRecipient]).toEqual(nextAmount + addedAmount);
                });

                it('subtracs from the sender wallet', () => {
                    expect(transaction.outputMap[senderWallet.publicKey]).toEqual(originalSenderOutput - nextAmount - addedAmount);
                });
            });
        });
    });

	describe('rewardTransaction()', () => {
		let rewardTransaction, minerWallet;
		beforeEach(() => {
			minerWallet = new Wallet({ privateKey: 'e99b2615b87da28752022963f7f225f5f0114244da765b06b941ba7ba28ba121' });
			rewardTransaction = Transaction.rewardTransaction({ minerWallet });
		});

		it('creates a transaction with the reward input', () => {
			expect(rewardTransaction.input).toEqual(REWARD_INPUT);	
		});

		it('creates one transaction for the miner with `MINING_REWARD`', () => {
				expect(rewardTransaction.outputMap[minerWallet.publicKey]).toEqual(MINING_REWARD);
		});	
	});
});
