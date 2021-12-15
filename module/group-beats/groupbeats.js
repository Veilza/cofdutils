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
      tabs: [{
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-body",
        initial: "players"
      }],
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
    const data = super.getData()
    
    // Define some Handlebars variables
    data.currentBeats = this.currentBeats
    data.playerList = []
    
    // Re-render the actor's data each time the data is called for
    this.activePlayers.forEach(actorID => {
      if(this.isActorAlive(actorID)){
        // Get the actor's sheet
        const player = game.actors.get(actorID)
                
        // Push only the data we need and format it nicely for Handlebar rendering
        data.playerList.push({
          id: player.data.id,
          img: player.data.img,
          name: player.data.name,
          beats: (player.data.data.beats % 5),
          xp: ~~(player.data.data.beats/5)
        })
      }
    })
    
    return data
  }

  // When the form is updated, re-render the template
  _updateObject(event, formData) {
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
    html.find(".playerImage").click(this._setSelected.bind(this))
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
      this.addActor(data.id)
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
      } else {
        // Otherwise, just add the new beats in
        
        // Define variables
        const currentBeats = this.currentBeats
        const newBeatsTotal = currentBeats + newBeats
        
        // Update the game settings and the beatsMenu data, then re-render
        game.settings.set("cofdutils", "groupbeats-currentBeats", newBeatsTotal)
        this.currentBeats = newBeatsTotal
      }
      
      this.render()
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
    this.render()
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
             const newBeats = Number(html.find('#newBeats')[0].value)
             
             // Set the new number of beats in the module
             this.updateBeats(newBeats)
             
             // Define the chat message to output
             const message = `${game.i18n.localize("CofD.GroupBeatsMenu.Message.added")} ${newBeats} ${game.i18n.localize("CofD.GroupBeatsMenu.Message.newBeats")} ${this.currentBeats}`
               
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
      const actors = this.activePlayers

      if(actors.length > 0){
        // Define how many beats each player gets.
        const beatsPerPlayer = ~~(this.currentBeats / actors.length) // Whole number
        const remainderBeats = (this.currentBeats % actors.length) // Remainder
        
        // Start of a chat message for awarding beats.
        let msg = `
          <b>${beatsPerPlayer} ${game.i18n.localize("CofD.GroupBeatsMenu.Message.beatsAwarded")}</b> 
          <br>${game.i18n.localize("CofD.GroupBeatsMenu.Message.recipients")}: 
        `
        
        // Promise chain to keep everything in sane order
        const promiseMeBeats = new Promise((resolve, reject) => {
          actors.forEach(actorID => 
          {
            // Check if the actors exist still, because if they don't this could
            // cause an error
            if(this.isActorAlive(actorID)){
              // Define variables for updating the beats
              // Player/Actor stuff
              const playerSheet = game.actors.get(actorID)
              
              // Beat numbers
              const playerOldBeats = playerSheet.data.data.beats
              const playerNewBeats = Number(playerOldBeats) + Number(beatsPerPlayer)
              
              // Update the beats in the actor's sheet
              game.actors.get(actorID).update({"data.beats": playerNewBeats})
              
              // Add each actor's name to the chat message
              msg += `${game.actors.get(actorID).data.name}, `
            }
          })
          
          // Wrap up crafting the chat message by removing the last ", " and replacing it with a period
          msg = msg.substring(0, msg.length-2)
          msg += '.'
          
          resolve()
        })
        
        // Send an update to the beats
        const promiseMeBeats2 = new Promise((resolve, reject) => {
          this.updateBeats(remainderBeats, true)
          
          resolve()
        })
        
        // Generate a chat message to notify everyone that story beats have been distributed
        const promiseMeBeats3 = new Promise((resolve, reject) => {
          ChatMessage.create({
            content: msg,
            speaker: {
              alias: game.i18n.localize("CofD.GroupBeatsMenu.alias")
            }
          }, {})
          
          resolve()
        })
        
        // Go through the promise chain
        promiseMeBeats
          .then(promiseMeBeats)
          .then(promiseMeBeats2)
          .then(promiseMeBeats3)
          .then(console.log("CofDUtils BeatsMenu: Beats distributed to players!"))
      }
    }
    
    // Set the number of grroup beats to 0
    _dropTheBeats(){    
      const message = game.i18n.localize("CofD.GroupBeatsMenu.Message.dropBeats")
      
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
    
    // When a player icon is clicked, open up the player edit menu
    _setSelected(player) {
      // Get ID of the player clicked
      const playerID = player.target.id
    }
    
    // Add a new actor to the active players list
    addActor(actorID) {
      // Define the actor data
      const actor = game.actors.get(actorID)
      
      // Check if the actor is unique in the already existing list;
      // Returns true if it's found, or false if it's not found
      const actorUniqueCheck = this.activePlayers.find(players => players == actorID)
            
      // If the actor exists and is unique
      if (!actorUniqueCheck) {
        // Push to the players list
        this.updateActors("add", actorID)
      }
    }
    
    // Checks if the actors still exist; if they were deleted, then remove them from the list
    isActorAlive(actorID){
      const actor = game.actors.get(actorID)
      
      // If the actor is dead, update the variables
      if(actor){
        // Actor is alive, continue
        return true
      } else {
        // Actor is dead, rewrite some variables
        const newPlayersList = this.activePlayers.filter((players) => players !== actorID)
        
        // Update players list
        this.updateActors("replace", newPlayersList)
        
        // Continue
        return false
      }
    }
}
