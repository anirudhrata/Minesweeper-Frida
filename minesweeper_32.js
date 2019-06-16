//Frida script to print out mine locations in 32bit minesweeper from Windows 7
//MineSweeper.exe version: 6.1.7600.16385 - hash: 02A4C588126B4E91328A82DE93A3EA43E16BF129 (SHA1)
//Run with the command:  frida -f MineSweeper.exe -l minesweeper_32.js --no-pause
//Start by clicking on any square. You'll get the minefield on the frida console.

var baseAddr = Module.findBaseAddress("MineSweeper.exe");
send(baseAddr)

//The offsets may vary based on the version. Change accordingly.
//Function pointer for GetRandom function
var getRandFuncPtr = baseAddr.add(0x2D7F3);

//Function pointer for PlaceMine function
var placeMineFuncPtr = baseAddr.add(0x200BB);

//Location to identify if GetRandom is being called from PlaceMine or not.
var getRandInPlaceMine = baseAddr.add(0x2017B);

//Flag to identify if GetRandom is being called from PlaceMine or not.
var globalFlag = false;

//Array which stores the random number.
var randomArray = [];

//Variables to store the initial click location.
var a1, a2;

//Method which checks if GetRandom is being called from PlaceMine or not.
function compareTrace (trace, func) {

    for (var val in trace) {
        
        if (func.compare(trace[val]) == 0) {
            return 0;
        }
    }
    return 1;

}

//Method to remove an element from an array.
function removeElement(array, elem) {  
    var index = array.indexOf(elem);
    if (index > -1) {
        array.splice(index, 1);
    }
}

//Method to generate valid locations for mines and then extract the mine locations from the generated random numbers.
function generateMineData (randomArray) {

    var myMineArray = [];

	//Possible valid mine locations based on initial click.
    for ( var i = 0; i < 81; ++i) {
        if ( (i % 9 - a1) * (2 * (i % 9 - a1 >= 0) - 1) > 1 || (Math.floor(i / 9) - a2) * (2 * (Math.floor(i / 9) - a2 >= 0) - 1) > 1 )
            myMineArray.push(i)
    }
    
    //Extract the mine location and then remove it from the possible location list.
    var mineData = [];
    for (var value in randomArray) {
        mineData.push(myMineArray[randomArray[value]]);
        removeElement(myMineArray, myMineArray[randomArray[value]]);
    }

	//Print the mine field.
    printMineField(mineData);

}


//Method to print the mine field
function printMineField (mineData) {
    var mineField = "";
	
    for (var i = 0; i < 9; i++) {
        for (var j = 0; j < 9; j++){
			if ( mineData.indexOf(9*i + j) != -1) { 
            mineField = mineField + "* ";
            }
			else {
			mineField = mineField + "O ";
            }
        }
        mineField = mineField + "\n";
    }

    console.log("\n");
    console.log(mineField);
}


//Hook PlaceMine function to get the initial click and clear the random number array
Interceptor.attach(placeMineFuncPtr, {
    onEnter: function (args) {
        randomArray = [];
        a1 = args[0];
        a2 = args[1];

    },


	//Generate mine locations as random numbers are already generated at this stage.
    onLeave: function (retval) {
        generateMineData(randomArray);
    }
})




//Hook GetRandom function to find out the locations of mine.
Interceptor.attach(getRandFuncPtr, {
    onEnter: function (args) {
		
        var trace = Thread.backtrace(this.context, Backtracer.ACCURATE);
        globalFlag = false;
		
		//Set flag to true only if GetRandom is called from PlaceMine.
        if (compareTrace (trace, getRandInPlaceMine) == 0){
            //console.log(trace);
            //console.log(args[1].toInt32());
            globalFlag = true;
        }
    
        
    },
    onLeave: function (retval) {
		//Save the random number only if flag is true.
        if (globalFlag){
            randomArray.push(retval.toInt32());
            //console.log(retval.toInt32());
        }
       
    }

});






