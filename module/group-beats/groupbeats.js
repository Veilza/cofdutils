export class GroupBeats extends FormApplication {
  // Modify the defaults
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["form"],
      title: "Group Beats Menu",
      id: "groupbeats",
      template: "modules/cofdutils/templates/groupbeatsmenu.hbs",
      width: 450,
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
  constructor(exampleOption) {
    super()
    this.currentBeats = game.settings.get("cofdutils", "currentBeats")
    this.activePlayers = game.settings.get("cofdutils", "activePlayers")
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
  }
  
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
  
  newBeatsDialogue(){
      // Generate a new dialogue to select an attribute
      let d = new Dialog({
       title: `Input Number of Beats`,
       content: `
        <form>
          <div class="form-group addBeats">
            <div>
              <label>New Beats</label>
              <input type="number" id="newBeats"/>
            </div>
          </div>
        </form>`,
       buttons: {
         select: {
           icon: '<i class="fas fa-check"></i>',
           label: "Add Beats",
           callback: (html) => {           
             // Define various variables
             let newBeats = html.find('#newBeats')[0].value
             let currentBeats = game.settings.get("cofdutils", "currentBeats")
             let newBeatsTotal = Number(currentBeats) + Number(newBeats) // Force these two to be numbers since it matters for math
             let message = "Added " + newBeats + " new story beats to the group pool. New total: " + newBeatsTotal
             
             // Set the new number of beats in the module
             game.settings.set("cofdutils", "currentBeats", newBeatsTotal)
             this.currentBeats = newBeatsTotal
             
             // Re-render the page
             this.render(true)
               
             // Generate a chat message to notify everyone that story beats have been added
             ChatMessage.create({
               content: message,
               speaker: {
                 alias: "Group Beats"
               }
             }, {})
           }
         },
         cancel: {
           icon: '<i class="fas fa-times"></i>',
           label: "Cancel"
         }
       },
       default: "cancel"
      })
      
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
          <b>${beatsPerPlayer} beats awarded to each player!</b> 
          <br>Recipients: 
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
        game.settings.set("cofdutils", "currentBeats", remainderBeats)
        this.currentBeats = remainderBeats
        
        // Re-render the page
        this.render(true)
        
        // Wrap up crafting the chat message
        msg = msg.substring(0, msg.length-2)
        msg += '.'
        
        // Generate a chat message to notify everyone that story beats have been distributed
        ChatMessage.create({
          content: msg,
          speaker: {
            alias: "Group Beats"
          }
        }, {})
      }
    }
    
    // Set the number of grroup beats to 0.
    _dropTheBeats(){    
      let message = "Beats have been dropped! Set new total to 0."
      
      // Set the new number of beats in the module
      game.settings.set("cofdutils", "currentBeats", 0)
      this.currentBeats = 0
      
      // Re-render the page
      this.render(true)

      // generate a chat message to notify everyone that story beats have been added
      ChatMessage.create({
        content: message,
        speaker: {
          alias: "Group Beats"
        }
      }, {})
    }
    
    getActorSheet(id){
      let sheetID = Object.keys(game.actors.contents).find(sheet => game.actors.contents[sheet].id === id)
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
        // Push actor to the list
        this.activePlayers.push(actor.data)
        // Update the game settings with the updated list
        game.settings.set("cofdutils", "activePlayers", this.activePlayers)
        
        // Re-render the page
        this.render(true)
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
      // Update the game settings with the updated list
      this.activePlayers = newPlayersList
      game.settings.set("cofdutils", "activePlayers", newPlayersList)
      
      // Re-render the page
      this.render(true)
      
      // Continue
      return false
    }
}
