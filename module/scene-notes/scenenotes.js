export class SceneNotes extends FormApplication {
  // Modify the defaults
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["form"],
      title: "Scene Notes",
      id: "scenenotes",
      template: "modules/cofdutils/templates/scenenotes.hbs",
      width: 920,
      height: 555,
      resizable: true,
      minimizable: true,
      closeOnSubmit: false,
      submitOnChange: true,
      dragDrop: [{
        dragSelector: ".entity.actor",
        dropSelector: null
      }]
    })
  }

  // Set initial data for the template
  constructor() {
    super()

    this.system = game.settings.get("cofdutils", "scenenotes-data")
    this.activeScene = game.settings.get("cofdutils", "scenenotes-activescene")
  }

  // Send data to the template
  async getData(options) {
    const context = super.getData(options)

    if(this.activeScene && this.system.scenes.find(scene => scene.id == this.activeScene)){
      // Find the active scene and set it so that its data is easy to access
      const scene = this.system.scenes.find(scene => scene.id == this.activeScene)

      // Define all the readable data for the page under here
      context.system = {
        activeScene: this.activeScene,
        scenes: this.system.scenes,
        actors: [],
        journals: [],
        items: [],
        activeSceneData: this.system.scenes.find(scene => scene.id == this.activeScene)
      }

      context.enrichedDescription = await TextEditor.enrichHTML(scene.description, {async: true})

      // Re-render the actor's data each time the data is called for
      if(scene.actors){
        scene.actors.forEach(actorID => {
          // Get the actor's sheet
          if(fromUuidSync(actorID)){
            const player = fromUuidSync(actorID)

            // Push only the data we need and format it nicely for Handlebar rendering
            context.system.actors.push({
              id: player.uuid,
              img: player.img,
              name: player.name
            })
          } else {
            // Remove the actor if it doesn't exist
            this._removeActor({ currentTarget: { id: actorID } })
          }
        })
      }

      // Re-render the journal's data each time the data is called for
      if(scene.journals){
        scene.journals.forEach(journalID => {
          // Get the actor's sheet
          if(fromUuidSync(journalID)){
            const journal = fromUuidSync(journalID)
  
            // Push only the data we need and format it nicely for Handlebar rendering
            context.system.journals.push({
              id: journal.uuid,
              img: "/icons/svg/book.svg",
              name: journal.name
            })
          } else {
            // Remove the journal if it doesn't exist
            this._removeJournal({ currentTarget: { id: journalID } })
          }
        })
      }

      // Re-render the journal's data each time the data is called for
      if(scene.items){
        scene.items.forEach(itemID => {
          // Get the actor's sheet
          if(fromUuidSync(itemID)){
            const item = fromUuidSync(itemID)
  
            // Push only the data we need and format it nicely for Handlebar rendering
            context.system.items.push({
              id: item.uuid,
              img: item.img,
              name: item.name
            })
          } else {
            // Remove the item if it doesn't exist
            this._removeItem({ currentTarget: { id: itemID } })
          }
        })
      }

      return context
    } else {
      context.system = {
        activeScene: null,
        scenes: [],
        actors: [],
        journals: [],
        items: [],
        activeSceneData: []
      }

      return context
    }
  }

  _getSubmitData(updateData) {
    const formData = foundry.utils.expandObject(super._getSubmitData(updateData))

    this.updateData({ description: formData.system.description })

    return formData
  }

  async _updateObject(event, formData){
    return formData
  }

  // Listeners for when the sheet is opened
  activateListeners(html) {
    super.activateListeners(html)

    // Tie functions to buttons
    html.find("#newScene").click(this._newScene.bind(this))
    html.find(".scene").click(this._changeScene.bind(this))
    html.find(".actorsList .actor").click(this._openSheet.bind(this))
    html.find(".actorsList .actor").contextmenu(this._removeActor.bind(this))
    html.find(".journals .journal").click(this._openJournal.bind(this))
    html.find(".journals .journal").contextmenu(this._removeJournal.bind(this))
    html.find(".items .item").click(this._openItem.bind(this))
    html.find(".items .item").contextmenu(this._removeItem.bind(this))
    html.find("#editSceneName").click(this._changeSceneName.bind(this))
    html.find("#deleteScene").click(this._deleteScene.bind(this))
  }

  // Response to an entity being dropped onto the page
  _onDrop(event) {
    let data

    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'))
    }
    catch (err) {
      return false
    }


    if (data.type == 'Actor') {
      // Data variables
      const newActor = data.uuid
      const sceneIndex = this.system.scenes.findIndex(scene => scene.id == this.activeScene)
      let actorData = this.system.scenes[sceneIndex].actors

      // Check if the actor is already in the list
      const actorUniqueCheck = actorData.find(actor => actor == newActor)

      // if the actor is unique, push it to the list and update the data
      if(!actorUniqueCheck){
        actorData.push(newActor)

        this.updateData({ actors: actorData })
      }
    }

    if (data.type == 'JournalEntry') {
      // Data variables
      const newJournal = data.uuid

      const sceneIndex = this.system.scenes.findIndex(scene => scene.id == this.activeScene)
      let journalData = this.system.scenes[sceneIndex].journals

      // Check if the journal is already in the list
      const journalUniqueCheck = journalData.find(journal => journal == newJournal)

      // if the journal ID is unique, push it to the list and update the data
      if(!journalUniqueCheck){
        journalData.push(newJournal)

        this.updateData({ journals: journalData })
      }
    }

    if (data.type == 'Item') {
      // Data variables
      const newItem = data.uuid

      const sceneIndex = this.system.scenes.findIndex(scene => scene.id == this.activeScene)
      let itemData = this.system.scenes[sceneIndex].items

      // Check if the item is already in the list
      const itemUniqueCheck = itemData.find(item => item == newItem)

      // if the item ID is unique, push it to the list and update the data
      if(!itemUniqueCheck){
        itemData.push(newItem)

        this.updateData({ items: itemData })
      }
    }
  }

  // Alter the name of the scene
  _changeSceneName () {
    let sceneName = this.system.scenes.find(scene => scene.id == this.activeScene).name

    // Generate a new dialogue to change the name
    let d = new Dialog({
     title: `${game.i18n.localize("CofD.SceneNotes.editNameTitle")} ${sceneName}`,
     content: `
      <form>
        <div class="form-group changeName">
          <div>
            <label>${game.i18n.localize("CofD.SceneNotes.editNameDesc")}</label>
            <input type="text" id="newName" value="${sceneName}"/>
          </div>
        </div>
      </form>`,
     buttons: {
       submit: {
         icon: '<i class="fas fa-check"></i>',
         label: `${game.i18n.localize("CofD.submit")}`,
         callback: (html) => {
           // Define the new number of beats, and force it to be a number
           const newName = html.find('#newName')[0].value

           // Update the scene name on submit
           this.updateData({ name: newName })
         }
       },
       cancel: {
         icon: '<i class="fas fa-times"></i>',
         label: game.i18n.localize("CofD.cancel")
       }
     },
     default: "submit"
    })

    // Render the dialogue
    d.render(true)
  }

  // Alter the name of the scene
  _deleteScene () {
    let sceneName = this.system.scenes.find(scene => scene.id == this.activeScene).name

    // Generate a new dialogue to change the name
    let d = new Dialog({
     title: `${game.i18n.localize("CofD.SceneNotes.deleteSceneTitle")} ${sceneName}`,
     content: `
      <form>
        <div class="form-group deleteScene">
          <div>
            <label>${game.i18n.localize("CofD.SceneNotes.deleteSceneDesc")}</label>
          </div>
        </div>
      </form>`,
     buttons: {
       submit: {
         icon: '<i class="fas fa-check"></i>',
         label: `${game.i18n.localize("CofD.confirm")}`,
         callback: () => {
           // Filter out the scene and delete it
           this.system.scenes = this.system.scenes.filter(scene => scene.id !== this.activeScene)
           game.settings.set("cofdutils", "scenenotes-data", this.system)

           if(this.system.scenes.length > 0){
             // if there is still at least 1 scene in the list, then swap to the first in the list
             this.activeScene = this.system.scenes[0].id

             // Update it in the settings
             game.settings.set("cofdutils", "scenenotes-activescene", this.system.scenes[0].id)
           } else {
             // Otherwise, there is no scene to swap to, and set it to null
             this.activeScene = null

             // Update it in the settings
             game.settings.set("cofdutils", "scenenotes-activescene", null)
           }

           this.render()
         }
       },
       cancel: {
         icon: '<i class="fas fa-times"></i>',
         label: game.i18n.localize("CofD.cancel")
       }
     },
     default: "cancel"
    })

    // Render the dialogue
    d.render(true)
  }

  // Open a sheet
  _openSheet (event) {
    // Get Actor ID
    const actorID = event.currentTarget.id

    // Open the sheet with the relevant ID
    fromUuidSync(actorID).sheet.render(true)
  }

  // Remove an actor from a scene's list
  _removeActor (event) {
    const actorID = event.currentTarget.id

    // Find the actors list for the current scene
    const sceneActors = this.system.scenes.find(scene => scene.id == this.activeScene).actors

    // Filter out the item with the ID, and then update the list
    this.updateData({ actors: sceneActors.filter((actor) => actor !== actorID) })
  }

  // Open a journal
  _openJournal (event) {
    // Get journal ID
    const journalID = event.currentTarget.id

    // Open the sheet with the relevant ID
    fromUuidSync(journalID).sheet.render(true)
  }

  // Remove a journal from a scene's list
  _removeJournal (event) {
    const journalID = event.currentTarget.id

    // Find the journals list for the current scene
    const sceneJournals = this.system.scenes.find(scene => scene.id == this.activeScene).journals

    // Filter out the journal with the ID, and then update the list
    this.updateData({ journals: sceneJournals.filter((journal) => journal !== journalID) })
  }

  // Open an item
  _openItem (event) {
    // Get item ID
    const itemID = event.currentTarget.id

    // Open the sheet with the relevant ID
    fromUuidSync(itemID).sheet.render(true)
  }

  // Remove a journal from a scene's list
  _removeItem (event) {
    // Get the item ID to remove
    const itemID = event.currentTarget.id

    // Find the items list for the current scene
    const sceneItems = this.system.scenes.find(scene => scene.id == this.activeScene).items

    // Filter out the item with the ID, and then update the list
    this.updateData({ items: sceneItems.filter((item) => item !== itemID) })
  }

  _newScene() {
    const uniqueID = Date.now() // Use the timestamp in order to generate a unique identifier

    const newScene = {
      id: `${uniqueID}`,
      name: `${game.i18n.localize("CofD.SceneNotes.newScene")}`,
      actors: [],
      journals: [],
      items: [],
      formData: {}
    }

    this.system.scenes.push(newScene)

    game.settings.set("cofdutils", "scenenotes-data", this.system)
    game.settings.set("cofdutils", "scenenotes-activescene", `${uniqueID}`)
    this.activeScene = `${uniqueID}`

    this.render()
  }

  _changeScene(event) {
    const sceneID = event.currentTarget.id

    game.settings.set("cofdutils", "scenenotes-activescene", sceneID)
    this.activeScene = sceneID

    this.render()
  }

  updateData(newData) {
    // Get the currently active scene
    const sceneIndex = this.system.scenes.findIndex(scene => scene.id == this.activeScene)

    // Grab the data from that scene
    const sceneData = this.system.scenes[sceneIndex]

    // Loop through properties and add in new data
    for(let property in newData) {
      if(newData.hasOwnProperty(property)) {
        sceneData[property] = newData[property];
      }
    }

    // Update it in the settings
    game.settings.set("cofdutils", "scenenotes-data", this.system)

    this.render()
  }
}
