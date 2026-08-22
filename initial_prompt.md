slow-pitch play simulator. I want a top down, accurate view of a softball field, including all bases, pitching plate, running lanes, infield and outfield, foul ball and dead ball lines, these should all be fixed and accurate in terms of measurements relative to screen size. I want this to be built using three.js

I want to have two teams, where I can assign names to each player, and a position, and a place in batting order.

I want to be able to assign attributes to each player, this includes speed which will dictate how fast they can cover distance when moving, throw speed, which dictates how fast the ball moves when they throw it, throw accuracy which dictates how close to their target they will get the ball, throw distance which dictates how far they can throw, catch/stop accuracy which dictates whether or not they will make the stop/catch.

I want to be able to define scenarios that play through. Each scenario should have play throughs for the following things: 
* Initial positions for all outfield players. These should be adjustable by the end user.
* Specifying if there are runners on each base
* ball moving from the base plate to a location on the field, with an assigned speed.
* runners running to each base in sequence at an assigned speed.
* The steps to run through the scenario are
 - Set initial outfield positions (these should have sensible defaults for each field position)
 - Hit ball (this starts the ball moving to it's location, this should run in real time based on distance and speed)
* Once the ball starts moving, the end user should be able to pause, and click each outfield player, and direct them to positions on the field, including sending a player to the ball, or mark them as inactive for the rest of the play. When they resume the play, the 
* Once a player gets to the ball check if they make the catch stop, based on their stats, and relative ball speed (slower speed increases chances) if they make the catch the play pauses and the user needs to click where they want the ball thrown.
* Play continues until all runners have gotten home, or the fielding team have either gotten all players out, or, they have covered off the bases to stop any more runners getting on base or home.

Build this in the current folder.