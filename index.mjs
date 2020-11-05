// IOhub CSV Writer Demo

import mqtt from "mqtt";
import objectsToCsv from "objects-to-csv";

const config = {
    mqttHost: process.env.MQTT_HOST ?? "127.0.0.1",
    mqttPort: process.env.MQTT_PORT ? parseInt(process.env.MQTT_PORT) : 1883,
    mqttInTopic: process.env.MQTT_IN_TOPIC ?? "fld/+/r/#",
    mqttReconnectPeriod: 5000,
    csvPath: process.env.CSV_PATH ?? "/tmp/log.csv"
};

const saveToCsv = async (data) => {
    return new Promise((resolve, reject) => {
        const csv = new objectsToCsv([data]);
        csv.toDisk(config.csvPath, { append: true })
            .then(() => {
                resolve();
            })
            .catch((error) => {
                console.error("csv write failed", error);
                reject();
            });
    });
};

const mqttBrokerSetup = (messageHandler) => {
    console.log(`Connecting to mqtt broker at ${config.mqttHost}:${config.mqttPort}`);

    const mqttClient = mqtt.connect(`mqtt://${config.mqttHost}:${config.mqttPort}`, {
        reconnectPeriod: config.mqttReconnectPeriod
    });

    mqttClient.on("connect", function () {
        console.log("connected to mqtt broker");

        // subscribe to configured topics
        mqttClient.subscribe(config.mqttInTopic, function (error) {
            if (error) {
                console.error(`Cannot subscribe to ${config.mqttInTopic}`, error);
            }
        });
    });

    mqttClient.on("message", function (topic, message) {
        try {
            messageHandler(topic, message.toString());
        } catch (error) {
            console.error(error);
        }
    });
};

const messageParser = (topic, message) => {
    // extract protocol and measurement
    const topicRegexp = /^([^\/]+)\/([^\/]+)\/{0,1}.*\/([^\/]+)$/;
    const match = topicRegexp.exec(topic);
    if (match.length < 4) {
        console.error("bad topic, cannot extract protocol");
        throw new Error("bad topic, cannot extract protocol");
    }
    const protocol = match[2];
    const measurement = match[3];

    // create object with all fields
    try {
        const messageObject = JSON.parse(message);
        return { ...messageObject, protocol, measurement };
    } catch (error) {
        console.error("Cannot parse message `${message}` as a valid json", error);
        throw new Error("Cannot parse message as a valid json");
    }
};

const messageHandler = async (topic, message) => {
    try {
        // parse message from string message received
        const parsedMessage = messageParser(topic, message);
        console.table(parsedMessage);

        // save to csv
        await saveToCsv(parsedMessage);
    } catch (error) {
        console.log(error);
    }
};

const main = () => {
    // show configuration in use
    console.log("Actual configuration");
    console.table(config);

    // connect to mqtt broker and subscribe to topics
    mqttBrokerSetup(messageHandler);
};

main();
