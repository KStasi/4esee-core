import {
  Field,
  SmartContract,
  state,
  State,
  method,
  PublicKey,
  Signature,
} from 'snarkyjs';

export class Oracle extends SmartContract {
  @state(PublicKey) oraclePublicKey = State<PublicKey>();
  @state(Field) result = State<Field>();

  @method initState(oraclePk: PublicKey) {
    this.oraclePublicKey.set(oraclePk);
    this.requireSignature();
  }

  @method getResult(): Field {
    const result = this.result.get();
    this.result.assertEquals(result);
    return result;
  }

  @method verify(result: Field, signature: Signature) {
    // Get the oracle public key from the contract state
    const oraclePublicKey = this.oraclePublicKey.get();
    this.oraclePublicKey.assertEquals(oraclePublicKey);
    // Evaluate whether the signature is valid for the provided data
    const validSignature = signature.verify(oraclePublicKey, [result]);
    // Check that the signature is valid
    validSignature.assertTrue();
    // Check that the provided value represents either true or false
    result.assertLessThan(Field(3));
    this.result.set(result);
  }
}
