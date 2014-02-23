///<reference path='../node.d.ts'/>
///<reference path='../node_modules/lm-connect-js/Client.d.ts'/>

// tsc compatible module requires
import connect = require('lm-connect-js');
import fs = require('fs');

// non-definition module requires
var xpath: any = require('xpath'),
    dom: any = require('xmldom').DOMParser;

// globals
var scenarios = process.cwd() + '/scenarios',
    client: connect.SewebarConnectClient,
    miner: connect.Miner,
    dataDictionary: string = fs.readFileSync(scenarios + '/01/datadictionary.xml', 'utf8'),
    task: string = fs.readFileSync(scenarios + '/01/task.xml', 'utf8'),
    taskType: string = 'task',
    template: string = '4ftMiner.Task.Template.PMML',
    selector = xpath.useNamespaces({ "guha": "http://keg.vse.cz/ns/GUHA0.1rev1" }),
    tries: number = 0,
    database: connect.DbConnection = {
        type: 'Access',
        file: 'Barbora.mdb'
    },
    metabase: connect.DbConnection = {
        type: 'Access',
        file: 'LM Barbora.mdb'
    },
    config = {
        url: "http://connect-dev.lmcloud.vse.cz",
        app: "LinkedTV"
    };

// create client
client = connect.createClient(config);

// register
client.register(database, metabase, (err, m) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    miner = m;

    console.log('Registered miner ' + m.id + '.');

    // init
    miner.init(dataDictionary, (err) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }

        console.log('Running task ...');

        // run task - type: task | proc | grid
        miner.runTask({
            type: taskType,
            definition: task,
            template: template
        }, (err, results) => {
            if (err) {
                console.error(err);
                process.exit(1);
            }

            processResults(miner, results);
        });
    });
});

function processResults(miner: connect.Miner, results: string): void {
    var doc = new dom().parseFromString(results),
        state = selector("//TaskState/text()", doc)[0].nodeValue,
        task = selector("//guha:AssociationModel/@modelName", doc)[0].nodeValue,
        period = 2000;

    if (state === 'Running') {
        if (++tries < 4) {
            console.log('Task is running (' + tries + '. attempt), waiting for ' + Math.round(period / 1000) + 's.');

            setTimeout(() => {
                miner.getTask({
                    type: taskType,
                    name: task,
                    template: template
                }, (err, results) => {
                    if (err) {
                        console.error(err);
                        process.exit(1);
                    }

                    processResults(miner, results);
                });
            }, period);
        } else {
            console.log('Canceling task ...');

            miner.cancelTask({
                type: taskType,
                name: task
            }, (err, results?) => {
                if (err) {
                    console.error(err);
                    process.exit(1);
                }

                console.log(results);
                process.exit(1);
            });
        }
    } else {
        writeResults(results);
    }
}

function writeResults(results: string): void {
    var filename = 'results_' + Date.now() + '.xml';

    console.log('Writing results to ' + filename + '.');

    fs.writeFileSync(filename, results);

    process.exit(0);
}

function getDataDictionary() {
    miner.getDataDictionary({ matrix: 'demo_13_csv60' }, (err, dd) => {
        console.log(dd);
    });
}

function removeMiner() {
    miner.remove((err) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
    });
}