const {Server} = require("socket.io")
const AwaitingDiscountPaymentModel = require("../models/BusinessOwners/AwaitingDiscountPayment")
const BusinessOwnersSocketIdModel = require("../models/BusinessOwners/BusinessOwnersSocketId")

  

const addNewBusinessOwner = async (businessOwnerId, socketId) => {
  try {
    const existingBusinessOwner = await BusinessOwnersSocketIdModel.findOne({ businessOwnerId });

    if (!existingBusinessOwner) {
      const newBusinessOwner = new BusinessOwnersSocketIdModel({ businessOwnerId, socketId });
      await newBusinessOwner.save();
      console.log(`Business owner with businessOwnerId ${businessOwnerId} and socketId ${socketId} added successfully.`);
    } else {
      console.log(`Business owner with businessOwnerId ${businessOwnerId} already exists.`);
      existingBusinessOwner.socketId = socketId
      existingBusinessOwner.save()

    }
  } catch (error) {
    console.error("Error adding new business owner:", error);
  }
};

  const removeBusinssOwner = async (socketId) => {
    try {
      await BusinessOwnersSocketIdModel.deleteOne({ socketId });
      console.log(`Business owner with socketId ${socketId} removed successfully.`);
    } catch (error) {
      console.error(`Error removing business owner with socketId ${socketId}:`, error);
    }
  };

  const getBusinessOwner = async (businessOwnerId)=>{
   return await BusinessOwnersSocketIdModel.findOne({businessOwnerId})
  }

  

const configureAwaitingRequest = (server)=>{


    const io = new Server(server, {
        cors: {
          origin: "*",
        },
      });

      io.on('connection', (socket) => {
        socket.on("newBusinessOwner",(businessOwnerId)=>{
          addNewBusinessOwner(businessOwnerId , socket.id)
        })

        socket.on("sendAllRequest", async ({businessOwnerId})=>{
          try {
            console.log(businessOwnerId);
            const result = await AwaitingDiscountPaymentModel.findOne({businessOwnerId})
            const receiver = await getBusinessOwner(businessOwnerId);
            console.log("result",result);
            let allRequest = await result.awaiting_discounts.reverse()
            io.to(receiver.socketId).emit("awaitingData", allRequest);
          } catch (error) {
            console.error("error", error);
          }
          

        })

        socket.on("sendNewRequest", async ({ businessOwnerId, newRequest }) => {
          try {
            // ایجاد یک شیء جدید اگر وجود نداشته باشد
            const result = await AwaitingDiscountPaymentModel.findOneAndUpdate(
              { businessOwnerId },
              { $push: { awaiting_discounts: newRequest } },
              { new: true, upsert: true }
            );

            console.log("result", result.awaiting_discounts);
        
            const receiver = await getBusinessOwner(businessOwnerId);
            console.log("businessOwnerId" , businessOwnerId);
            console.log("receiver" , receiver);
            let allRequest = await result.awaiting_discounts.reverse()
            io.to(receiver.socketId).emit("awaitingData", allRequest);
          } catch (error) {
            console.error("error", error);
          }
        });
        
        
       
        socket.on("disconnect", ()=>{
          removeBusinssOwner(socket.id)
        })

      });

}

module.exports = {configureAwaitingRequest}