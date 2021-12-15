// When a token is selected, grab the token's defense
Hooks.on("targetToken", (user, token, targeted) => {
  if(targeted){
    // Set penalty to the targeted token's defense
    game.settings.set("cofdutils", "combatselector-penalty", token.actor.data.data.derivedTraits.defense.value)
  } else {
    // Clear it back to 0, no penalty
    game.settings.set("cofdutils", "combatselector-penalty", 0)
  }
})

// When an application is rendered, check if the automated defense is applicable
Hooks.on("renderApplication", (app, html, data) => {
  // Get the text and check it for the weapon dicepools
  const textCheck = html[0].innerText
  if(textCheck.includes("Strength + Brawl") || textCheck.includes("Strength + Weaponry") || textCheck.includes("Dexterity + Athletics")){
    // Check the game settings if the penalty should be applied automatically
    if(game.settings.get("cofdutils", "combatselector-automatedDefense")){
      // Grab the currently selected token's defense, reverse it, and then add it to the existing bonus/penalty.
      const targetedDefense = -Math.abs(game.settings.get("cofdutils", "combatselector-penalty"))
      const totalPenalty = Number(targetedDefense) + Number(data.bonusDice)
      
      // Change the input field on the weapon dialogue
      html.find("input[name='dicePoolBonus']").attr("value", totalPenalty)
      html.find(".niceNumber .theNumber span:first").text(totalPenalty)
    }
  }
})
