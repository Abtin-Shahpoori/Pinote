const Wallet = require('./index')
const Transaction = require('./transaction');
const { verifySignature } = require('../util')
const Blockchain = require('../blockchain')
const { STARTING_BALANCE } = require('../config');

describe('Wallet', () => {
    let wallet;

    beforeEach(() => {
        wallet = new Wallet();
    });

    it('has a `balance`', () => {
        expect(wallet).toHaveProperty('balance');
    });

    it('has a `publicKey`', () => {
        expect(wallet).toHaveProperty('publicKey');
    });

    describe('signing data', () => {
        const data = "MEOWITY";

        it('verifies the signature', () => {
            expect(
                verifySignature({
                    publicKey: wallet.publicKey,
                    data,
                    signature: wallet.sign(data),
                })
            ).toBe(true);
        });

        it('doesnt verify an invalid signature', () => {
            expect(verifySignature({
                publicKey: wallet.publicKey,
                data,
                signature: new Wallet().sign(data)
            }))
        });

    });

    describe('createTransaction()', () => {
        describe('and the amount exceeds balance', () => {
            it('throws an error', () => {
                expect(() => wallet.createTransaction({amount: 8090, recipient: 'myself'}))
                 .toThrow('Amount exceeds balance');
            });
        });

        describe('and the amount is valid', () => {
            let transaction, amount, recipient;

            beforeEach(() => {
                amount = 3;
                recipient = 'me';
                transaction = wallet.createTransaction({ amount, recipient });
            })

            it('creates an instance of Transaction', () => {
                expect(transaction instanceof Transaction).toBe(true);
            });

            it('matches transaction input with the wallet', () => {
                expect(transaction.input.address).toEqual(wallet.publicKey);
            });

            it('ouputs the amount the recepient', () => {
                expect(transaction.outputMap[recipient]).toEqual(amount);
            });
        });
				
			describe('and a chain is passed', () => {
				it('calls `Wallet.calculateBalance`', () => {
					const calculateBalanceMock = jest.fn();
					const originalCalculateBalance = Wallet.calculateBalance;
					
					Wallet.calculateBalance = calculateBalanceMock;
					wallet.createTransaction({
						recipient: 'burn',
						amount: 10,
						chain: new Blockchain().chain
					});

					expect(calculateBalanceMock).toHaveBeenCalled();
					Wallet.calculateBalance = originalCalculateBalance;
				});
			});
    });

	describe('caclculateBalance()', () => {
		let blockchain;

		beforeEach(() => {
			blockchain = new Blockchain();		
		});

		describe('and there are no output for the wallet', () => {
			it('returns the `STARTING_BALANCE`', () => {
				expect(
					Wallet.calculateBalance({
						chain: blockchain.chain,
						address: wallet.publicKey
					})
				).toEqual(STARTING_BALANCE)
			});
		});

		describe('and there are outputs for the wallet', () => {
			let transactionOne, transactionTwo;

			beforeEach(() => {
				transactionOne = new Wallet().createTransaction({
					recipient: wallet.publicKey,
					amount: 50
				});
				
				transactionTwo = new Wallet().createTransaction({
					recipient: wallet.publicKey,
					amount: 10
				})

				blockchain.addBlock({ Data: { Transactions: [transactionOne, transactionTwo] } });
			});

			it('adds the sum of all ouputs to the wallet balance', () => {
				expect(
					Wallet.calculateBalance({
						chain: blockchain.chain,
						address: wallet.publicKey
					})
				).toEqual(
					STARTING_BALANCE + transactionOne.outputMap[wallet.publicKey] + transactionTwo.outputMap[wallet.publicKey]
				)
			});

			describe('and the wallet has made a transaction', () => {
				let recentTransaction;

				beforeEach(() => {
					recentTransaction = wallet.createTransaction({
						recipient: 'burn',
						amount: 30
					});

					blockchain.addBlock({ Data: { Transactions: [recentTransaction] } });
				});

				it('returns the output amount of the recent transaction', () => {
					expect(
						Wallet.calculateBalance({
							chain: blockchain.chain,
							address: wallet.publicKey
						})
					).toEqual(recentTransaction.outputMap[wallet.publicKey]);
				});

				describe('and there are outputs next to and after the recent transaction', () => {
					beforeEach(() => {
						recentTransaction = wallet.createTransaction({
							reipient: 'burny',
							amount: 60
						});

						sameBlockTransaction = Transaction.rewardTransaction({ minerWallet: wallet });

						blockchain.addBlock({ Data: { Transactions: [recentTransaction, sameBlockTransaction] } });

						nextBlockTransaction = new Wallet().createTransaction({
							recipient: wallet.publicKey,
							amount: 75
						});

						blockchain.addBlock({ Data: {Transactions: [nextBlockTransaction]} })
					});

					it('includes the output amounts in the returned balance', () => {
						expect(
							Wallet.calculateBalance({
								chain: blockchain.chain,
								address: wallet.publicKey
							})
						).toEqual(
								recentTransaction.outputMap[wallet.publicKey] +
								sameBlockTransaction.outputMap[wallet.publicKey] + 
								nextBlockTransaction.outputMap[wallet.publicKey]
							)
					});
				});
			});
		});
	})

	describe('login works', () => {
		beforeEach(() => {
			FpublicKey = wallet.getSeed().Address;
			Fseed = wallet.getSeed().Seed;
			SpublicKey = wallet.getSeed().Address;
			Sseed = wallet.getSeed().Seed;
			blockchain = new Blockchain();
		});

		it('can login', () => {
			console.log(wallet.login({ userPublicKey: FpublicKey, seed: Fseed}) !== SpublicKey);
		});
	});

	describe('adds the new token to the blockchain', () => {		
	});
});
