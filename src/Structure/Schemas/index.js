const mongoose = require("mongoose");
const { Logger } = require("../Functions/index");
const logger = new Logger();

const ticketSchema = require("./Ticket/ticketSchema");
const LFRequest = require("./LookingFor/lfplft");

function ConnectMongo(client) {
  if (client.config.mongoUrl) {
    logger.info("Trying to connect with database...");
    mongoose.set("strictQuery", false);
    mongoose
      .connect(client.config.mongoUrl)
      .then((data) => {
        logger.success(
          `Database has been connected to: "${data.connection.name}"`
        );
      })
      .catch((err) => logger.error(err));
  } else logger.warn(`You forget to add mongoUrl in config.js`);
}

module.exports = {
  ConnectMongo,
  ticketSchema,
  LFRequest
};