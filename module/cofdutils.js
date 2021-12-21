// GroupBeats module constructor
import { BeatsMenu } from './beats-menu/beatsmenu.js'

// SceneNotes module constructor
import { SceneNotes } from './scene-notes/scenenotes.js'

// Combat Selector module
import('./combat-selector/combatselector.js')

// Register module settings
Hooks.on("ready", () => {
  // For storing the current number of beats
  game.settings.register("cofdutils", "beatsmenu-currentBeats", {
    name: "Current Beats",
    scope: "world",
    config: false,
    default: 0,
    type: Number
  })
  // For storing the players list
  game.settings.register("cofdutils", "beatsmenu-activePlayers", {
    name: "Players",
    scope: "world",
    config: false,
    default: [],
    type: Array
  })
  // For storing the targeting defense penalty
  game.settings.register("cofdutils", "combatselector-penalty", {
    name: "Defense Penalty",
    scope: "client",
    config: false,
    default: 0,
    type: Number
  })
  // Whether to automatically remove targeted actor's defense from combat rolls
  // GM can disable/enable this as they like
  game.settings.register("cofdutils", "combatselector-automatedDefense", {
    name: game.i18n.localize("CofD.Settings.AutomaticDefense.Name"),
    hint: game.i18n.localize("CofD.Settings.AutomaticDefense.Description"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  })
  // For storing the Scene Notes data
  const uniqueID = Date.now() // Use the timestamp in order to generate a unique identifier
  game.settings.register("cofdutils", "scenenotes-data", {
    name: "Scene Notes Data",
    scope: "world",
    config: false,
    default: {
      scenes: [
        {
          id: `${uniqueID}`,
          name: "New Scene",
          actors: [],
          journals: [],
          items: [],
          formData: {}
        }
      ]
    },
    type: Object
  })
  // For storing the active scene
  game.settings.register("cofdutils", "scenenotes-activescene", {
    name: "Active Scene",
    scope: "world",
    config: false,
    default: uniqueID,
    type: String
  })
})

// Generate the button(s)
Hooks.on("getSceneControlButtons", (controls) => {
  // Simple way to locate the token controls
  let tokenControls = controls.find(c => c.name === "token" )

  // Push the button to the token controls
  if(tokenControls && tokenControls.hasOwnProperty('tools')){
    tokenControls.tools.push(
      // Beats Menu button
      {
        name: "beats",
        title: game.i18n.localize("CofD.BeatsMenu.alias"),
        icon: "fas fa-user-edit",
        button: true,
        visible: game.user.isGM, // Only show this button to the GM
        onClick: () => new BeatsMenu().render(true) // Function to show the Beats Menu application
      },
      // Scene Notes button
      {
        name: "scenes",
        title: game.i18n.localize("CofD.SceneNotes.alias"),
        icon: "fas fa-book",
        button: true,
        visible: game.user.isGM, // Only show this button to the GM
        onClick: () => new SceneNotes().render(true) // Function to show the Scene Notes application
      }
    )
  }
})

// Handle actor updates
Hooks.on("updateActor", (actor) => {
  // Some variables
  const actorID = actor.id
  const activeBeatsMenu = Object.values(ui.windows).find(windows => windows.id == "beatsmenu")
  const activeSceneNotes = Object.values(ui.windows).find(windows => windows.id == "scenenotes")

  // Only do this if the Beats Menu is active
  if(activeBeatsMenu){
    // Beats Menu variables
    const activePlayers = game.settings.get("cofdutils", "beatsmenu-activePlayers")

    // If the actor is in the active players list...
    if(activePlayers.find(players => players == actorID)){
      // Re-render the GroupBeats menu
      Object.values(ui.windows).find(windows => windows.id == "beatsmenu").render()
    }
  }

  // Only do this if the Scene Notes are active
  if(activeSceneNotes){
    // Scene Notes variables
    const sceneData = game.settings.get("cofdutils", "scenenotes-data")
    const activeScene = game.settings.get("cofdutils", "scenenotes-activescene")
    const actorsList = sceneData.scenes.find(scene => scene.id == activeScene).actors

    // If the actor is in the scene's players list...
    if(actorsList.find(actors => actors == actorID)){
      // Re-render the GroupBeats menu
      Object.values(ui.windows).find(windows => windows.id == "scenenotes").render()
    }
  }
})
