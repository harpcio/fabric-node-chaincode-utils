/* tslint:disable */
import { ChaincodeReponse } from 'fabric-shim';
import { ChaincodeMockStub } from '@theledger/fabric-mock-stub';
import { TestChaincode } from './TestChaincode';
import { Transform } from '../src';

import { expect } from 'chai';

const chaincode = new TestChaincode();

describe('Test Mockstub', () => {
    it('Should be able to init', async () => {

        const stub = new ChaincodeMockStub('mock', chaincode);

        const args = ['arg1', 'arg2'];

        const response: ChaincodeReponse = await stub.mockInit('uudif', args);

        console.log("response", Transform.bufferToObject(response.payload));

        expect(Transform.bufferToObject(response.payload)['args']).to.deep.equal(args);
    });

    const stubWithInit = new ChaincodeMockStub('mock', chaincode);

    it('Should be able to init and make some cars', async () => {

        const args = ['init', 'arg2'];

        await stubWithInit.mockInit('uudif', args);

        expect(Object.keys(stubWithInit.state).length).to.equal(10);
    });

    it('Should be able to query first car', async () => {

        const car0 = {
            'make': 'Toyota',
            'model': 'Prius',
            'color': 'blue',
            'owner': 'Tomoko',
            'docType': 'car'
        };

        const response: ChaincodeReponse = await stubWithInit.mockInvoke('test', ['queryCar', JSON.stringify({
            key: 'CAR0'
        })]);

        expect(response.status).to.eq(200);

        expect(Transform.bufferToObject(response.payload)).to.deep.equal(car0);
    });

    it('Should be able to query using getStateByRange', async () => {

        const response: ChaincodeReponse = await stubWithInit.mockInvoke('test', ['queryAllCars']);

        expect(response.status).to.eq(200);

        expect(Transform.bufferToObject(response.payload)).to.be.length(10);
    });

    it('Should be able to query using getQueryResult', async () => {

        const response: ChaincodeReponse = await stubWithInit.mockInvoke('test', ['richQueryAllCars']);

        expect(response.status).to.eq(200);

        expect(Transform.bufferToObject(response.payload)).to.be.length(10);
    });

    it('Should be able to query using getHistoryForKey', async () => {

        const response: ChaincodeReponse = await stubWithInit.mockInvoke('test', ['getCarHistory']);

        expect(response.status).to.eq(200);

        expect(Transform.bufferToObject(response.payload)).to.be.length(1);
    });

    it('Update and getHistoryForKey', async () => {
        const stub = new ChaincodeMockStub('Update and getHistoryForKey\'', chaincode);

        const response: ChaincodeReponse = await stub.mockInvoke('create', ['createCar', JSON.stringify({
            key: 'CAR0',
            make: "make",
            model: "model",
            color: "color",
            owner: 'owner'
        })]);

        expect(response.status).to.eq(200);

        const queryResponse: ChaincodeReponse = await stub.mockInvoke('querytest', ['queryCar', JSON.stringify({
            key: 'CAR0'
        })]);

        expect(queryResponse.status).to.eq(200);

        expect((<any>Transform.bufferToObject(queryResponse.payload)).owner).to.equal("owner");

        await stub.mockInvoke('update', ['changeCarOwner', JSON.stringify({
            key: "CAR0",
            owner: "newowner"
        })]);

        const getCarHistoryresponse: ChaincodeReponse = await stub.mockInvoke('test', ['getCarHistory']);

        expect(getCarHistoryresponse.status).to.eq(200);
        console.log(Transform.bufferToObject(getCarHistoryresponse.payload));

        expect(Transform.bufferToObject(getCarHistoryresponse.payload)).to.be.length(2);
        expect(Transform.bufferToObject(getCarHistoryresponse.payload)[1].value.owner).to.be.eq("newowner");
    });

    it('Should be able to mock composite keys', async () => {
        const stub = new ChaincodeMockStub('GetStateByPartialCompositeKeyTest', chaincode);

        stub.mockTransactionStart("composite");

        // Add car 1
        const car1 = {objectType: "CAR", make: "volvo", color: "red"};

        const ck1 = stub.createCompositeKey(car1.objectType, [car1.make, car1.color]);

        await stub.putState(ck1, Transform.serialize(car1));

        // Add car 2
        const car2 = {objectType: "CAR", make: "volvo", color: "blue"};

        const ck2 = stub.createCompositeKey(car2.objectType, [car2.make, car2.color]);

        await stub.putState(ck2, Transform.serialize(car2));

        // Add car 3
        const car3 = {objectType: "CAR", make: "jaguar", color: "red"};

        const ck3 = stub.createCompositeKey(car1.objectType, [car3.make, car3.color]);

        await stub.putState(ck3, Transform.serialize(car3));

        stub.mockTransactionEnd("composite");

        // should return in sorted order of attributes
        const expectKeys = [ck1, ck2];
        const expectKeysAttributes = [["volvo", "red"], ["volvo", "blue"]];
        const expectValues = [Transform.serialize(car1), Transform.serialize(car2)];

        const it = await stub.getStateByPartialCompositeKey("CAR", ["volvo"]);

        for (let i = 0; i < 2; i++) {
            const response = await it.next();

            if (expectKeys[i] !== response.value.key) {
                throw new Error(`Expected key ${expectKeys[i]} got ${response.value.key}`)
            }
            const t = stub.splitCompositeKey(response.value.key);

            if (t.objectType !== "CAR") {
                throw new Error(`Expected key "CAR" got ${t.objectType}`)
            }

            t.attributes.forEach((attr: string, index: number) => {
                if (expectKeysAttributes[i][index] != attr) {
                    throw new Error(`Expected keys attribute ${expectKeysAttributes[i][index]} got ${attr}`);
                }
            });

            expect(response.value.value).to.eql(expectValues[i]);

        }
    });

    it('Test create new car', async () => {

        const stub = new ChaincodeMockStub('mock', chaincode);

        const response: ChaincodeReponse = await stub.mockInvoke('test', ['createCar', JSON.stringify({
            key: 'CAR0',
            make: "prop1",
            model: "prop2",
            color: "prop3",
            owner: 'test'
        })]);

        expect(response.status).to.eq(200);

        expect(Object.keys(stub.state).length).to.equal(1);
    });

    it('Test create new car with deterministic uuid', async () => {

        const stub = new ChaincodeMockStub('mock', chaincode);

        const response: ChaincodeReponse = await stub.mockInvoke('test', ['createCar', JSON.stringify({
            make: "prop1",
            model: "prop2",
            color: "prop3",
            owner: 'test'
        })]);

        expect(response.status).to.eq(200);

        expect(Object.keys(stub.state).length).to.equal(1);

        expect(Object.keys(stub.state)[0]).to.not.equal("CAR0")

    });


    it('Should be able to query using rich queries', async () => {

        const query = {
            selector: {
                make: "Toyota"
            }
        };

        const it = await stubWithInit.getQueryResult(JSON.stringify(query));

        const items = await Transform.iteratorToList(it);

        expect(items).to.deep.include({
            make: 'Toyota',
            model: 'Prius',
            color: 'blue',
            owner: 'Tomoko',
            docType: 'car'
        })
    });

    it('Should be able to query using an rich query operator ', async () => {

        const query = {
            selector: {
                model: {
                    $in: ['Nano', "Punto"]
                }
            }
        };

        const it = await stubWithInit.getQueryResult(JSON.stringify(query));

        const items = await Transform.iteratorToList(it);

        expect(items).to.be.length(2)
    });

    it('Should be able to return 0', async () => {

        const stub = new ChaincodeMockStub('mock', chaincode);

        await stub.putState('a', 0);

        const result = await stub.mockInvoke("testReturn0", ["testReturn0"]);

        expect(Transform.bufferToObject(result.payload)).to.equal(0)
    });

    it('Should be able to return null', async () => {

        const stub = new ChaincodeMockStub('mock', chaincode);

        await stub.putState('a', 0);

        const result = await stub.mockInvoke("testReturn0", ["testReturn0", "b"]);

        expect(Transform.bufferToObject(result.payload)).to.equal(null)
    });


});
