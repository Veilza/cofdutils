export class GroupBeats extends FormApplication {
  // Modify the defaults
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["form"],
      title: "Group Beats Menu",
      id: "groupbeats",
      template: "modules/cofdutils/templates/groupbeatsmenu.hbs",
      width: 500,
      height: 200,
      resizable: true,
      minimizable: true,
      closeOnSubmit: false,
      dragDrop: [{
        dragSelector: ".entity.actor",
        dropSelector: null
      }]
    })
  }
  
  // Set initial data for the template
  constructor() {
    super()
    this.currentBeats = game.settings.get("cofdutils", "groupbeats-currentBeats")
    this.activePlayers = game.settings.get("cofdutils", "groupbeats-activePlayers")
  }
  
  // Send data to the template
  getData() {
    // Remove actors that have been deleted
    this.activePlayers.forEach(actor => {      
      this.isActorAlive(actor.id)
    })
    
    return {
      currentBeats: this.currentBeats,
      activePlayers: this.activePlayers
    }
  }

  // When the form is updated, re-render the template
  async _updateObject(event, formData) {
    this.render()
  }
  
  // Listeners for when the sheet is opened
  activateListeners(html) {
    super.activateListeners(html)
    
    // Tie functions to buttons
    html.find(".addBeats").click(this.newBeatsDialogue.bind(this))
    html.find(".distributeBeats").click(this._distributeBeats.bind(this))
    html.find(".dropBeats").click(this._dropTheBeats.bind(this))
    html.find(".dropActors").click(this._dropActors.bind(this))
  }
  
  // Response to an actor being dropped onto the beats menu
  _onDrop(event) {
    let data
    try {
        data = JSON.parse(event.dataTransfer.getData('text/plain'))
    }
    catch (err) {
        return false
    }


    if (data.type == 'Actor') {
      this.addActor(data)
    }
  }
  
  // Function to update the beats setting
  updateBeats(newBeats, replace) {
    // Only go forward if the newBeats are a number
    if(typeof newBeats === "number"){
      if(replace){
        // Replace the current number of beats with the given amount
        
        // Update the game settings and the beatsMenu data, then re-render
        game.settings.set("cofdutils", "groupbeats-currentBeats", newBeats)
        this.currentBeats = newBeats
        this.render(true)
      } else {
        // Otherwise, just add the new beats in
        
        // Define variables
        let currentBeats = this.currentBeats
        let newBeatsTotal = currentBeats + newBeats
        
        // Update the game settings and the beatsMenu data, then re-render
        game.settings.set("cofdutils", "groupbeats-currentBeats", newBeatsTotal)
        this.currentBeats = newBeatsTotal
        this.render(true)
      }
    }
  }
  
  // Function to update the actors setting
  updateActors(operation, newData) {
    // Switch case to determine what to do with the data    
    switch(operation){
      // Clear the list
      case "clear":
        // Setting the length to 0 is a simple and effective way to clear it
        this.activePlayers.length = 0
        
        break
        
      // Append new actors to the list
      case "add":
        // Push actor to the list
        this.activePlayers.push(newData)
        
        break
      
      // Wholly replace the previous list with the new data
      case "replace":
        // Fill in the list with the new data
        this.activePlayers = newData
        
        break
      default:
        console.log(`CofDUtils BeatsMenu: ${game.i18n.localize("CofD.Error.noOperationSpecified")}`)
    }
    
    // Update the game settings with the updated list
    game.settings.set("cofdutils", "groupbeats-activePlayers", this.activePlayers)
    // Re-render the page
    this.render(true)
  }
  
  // Adding new beats function
  newBeatsDialogue(){
      // Generate a new dialogue to input the number of beats
      let d = new Dialog({
       title: game.i18n.localize("CofD.GroupBeatsMenu.title"),
       content: `
        <form>
          <div class="form-group addBeats">
            <div>
              <label>${game.i18n.localize("CofD.GroupBeatsMenu.newBeats")}</label>
              <input type="number" id="newBeats"/>
            </div>
          </div>
        </form>`,
       buttons: {
         select: {
           icon: '<i class="fas fa-check"></i>',
           label: `${game.i18n.localize("CofD.GroupBeatsMenu.addBeats")}`,
           callback: (html) => {           
             // Define the new number of beats, and force it to be a number
             let newBeats = Number(html.find('#newBeats')[0].value)
             
             // Set the new number of beats in the module
             this.updateBeats(newBeats)
             
             // Define the chat message to output
             let message = `${game.i18n.localize("CofD.GroupBeatsMenu.Message.added")} ${newBeats} ${game.i18n.localize("CofD.GroupBeatsMenu.Message.newBeats")} ${this.currentBeats}`
               
             // Generate a chat message to notify everyone that story beats have been added
             ChatMessage.create({
               content: message,
               speaker: {
                 alias: game.i18n.localize("CofD.GroupBeatsMenu.alias")
               }
             }, {})
           }
         },
         cancel: {
           icon: '<i class="fas fa-times"></i>',
           label: game.i18n.localize("CofD.GroupBeatsMenu.cancel")
         }
       },
       default: "cancel"
      })
      
      // Render the dialogue
      d.render(true)
    }
  
    // Distribute beats function
    _distributeBeats() {
      // set of players to distribute.
      let actors = this.activePlayers

      if(actors.length > 0){
        // Define how many beats each player gets.
        let beatsPerPlayer = ~~(this.currentBeats / actors.length) // Whole number
        let remainderBeats = (this.currentBeats % actors.length) // Remainder
        
        // Start of a chat message for awarding beats.
        let msg = `
          <b>${beatsPerPlayer} ${game.i18n.localize("CofD.GroupBeatsMenu.Message.beatsAwarded")}</b> 
          <br>${game.i18n.localize("CofD.GroupBeatsMenu.Message.recipients")}: 
        `
            
        actors.forEach(actor => 
        {
          // Check if the actors exist still, because if they don't this could
          // cause an error
          if(this.isActorAlive(actor.id)){
            // Define variables for updating the beats
            // Player/Actor stuff
            let player = this.getEntity({ type: "Actor", id: actor.id })
            let playerSheet = this.getActorSheet(actor.id)
            // Beat numbers
            let playerOldBeats = player.entity.data.data.beats
            let playerNewBeats = Number(playerOldBeats) + Number(beatsPerPlayer)
            
            // Update the number of beats in the sheet
            playerSheet.update({"data.beats": playerNewBeats})
            
            // Add each actor's name to the chat message
            msg += `${player.entity.data.name}, `
          }
        })
        
        // Set the new number of beats to the remainder
        this.updateBeats(remainderBeats, true)
        
        // Wrap up crafting the chat message
        msg = msg.substring(0, msg.length-2)
        msg += '.'
        
        // Generate a chat message to notify everyone that story beats have been distributed
        ChatMessage.create({
          content: msg,
          speaker: {
            alias: game.i18n.localize("CofD.GroupBeatsMenu.alias")
          }
        }, {})
      }
    }
    
    // Set the number of grroup beats to 0
    _dropTheBeats(){    
      let message = game.i18n.localize("CofD.GroupBeatsMenu.Message.dropBeats")
      
      // Set the number of beats to 0
      this.updateBeats(0, true)

      // Generate a chat message to notify everyone that story beats have been added
      ChatMessage.create({
        content: message,
        speaker: {
          alias: game.i18n.localize("CofD.GroupBeatsMenu.alias")
        }
      }, {})
    }
    
    // Simple binding function to clear the actors list
    _dropActors(){
      this.updateActors("clear")
    }
    
    // Get the actor sheet via ID
    getActorSheet(id){
      // Search through the game for the sheet
      let sheetID = Object.keys(game.actors.contents).find(sheet => game.actors.contents[sheet].id === id)
      
      // Send the actor sheet back
      return game.actors.contents[sheetID]
    }
    
    // Get the actor entity
    getEntity(data) {
      // Retrieve the entity from the Actor collection
      // Technically this works for all entities, but earlier functions
      // prevent this from being called for anything but actors
      let entity
      entity = game.collections.get(data.type).get(data.id)
      
      // Easily storable entity format
      let result = { entity: entity, data: {} }
      
      if (entity) {
        // Store useful data
        result.data = {
          id: entity.id,
          uuid: entity.uuid,
          img: entity.img,
          name: entity.name,
          type: data.type
        }
      }
      
      // Send transformed entity data back
      return result
    }
    
    // Add a new actor to the active players list
    addActor(data) {
      // Define the actor data
      let actor = this.getEntity(data)
      
      // Check if the actor is unique in the already existing list;
      // Returns true if it's found, or false if it's not found
      let actorUniqueCheck = this.activePlayers.find(players => players.id == actor.data.id)
      
      // If the actor exists and is unique
      if (actor.entity && (!actorUniqueCheck)) {
        // Push to the players list
        this.updateActors("add", actor.data)
      }
    }
    
    // Checks if the actors still exist; if they were deleted, then remove them from the list
    isActorAlive(id){
      let actorAlive = Object.keys(game.actors.contents).find(sheet => game.actors.contents[sheet].id === id)
      
      // If the actor is dead, update the variables
      if(actorAlive > -1){
        // Actor is alive, continue
        return true
      }
      
      // Actor is dead, rewrite some variables
      let newPlayersList = this.activePlayers.filter((players) => players.id !== id)
      
      // Update players list
      this.updateActors("replace", newPlayersList)
      
      // Continue
      return false
    }
}
