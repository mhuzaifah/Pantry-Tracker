'use client'
import React from 'react';
import {useState, useEffect, useRef} from "react";
import {firestore} from '@/firebase'
import {collection, query, getDocs, getDoc, doc, deleteDoc, setDoc} from 'firebase/firestore';
import {
    Box,
    Button,
    FormControl, Input,
    InputAdornment, IconButton, InputLabel,
    MenuItem,
    Modal, Paper,
    Select,
    Stack,
    TextField,
    Typography
} from "@mui/material";
// import SearchIcon from '@mui/icons-material/Search';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {faAdd, faSearch, faSubtract, faTrash} from '@fortawesome/free-solid-svg-icons';
import {Camera} from "react-camera-pro";

const Home = () => {

    /* Inventory Vars */
    const [inventory, setInventory] = useState([]);
    const [open, setOpen] = useState(false);
    const [itemName, setItemName] = useState('');
    const [itemQuantity, setItemQuantity] = useState(0)
    const [itemUnit, setItemUnit] = useState('')
    const [filter, setFilter] = useState('');

    /* Camera Vars */
    const [cameraOn, setCameraOn] = useState(false);
    const camera = useRef(null);
    //const [image, setImage] = useState(null);

    /* Recipes Vars */
    const [recipes, setRecipes] = useState([])

    const updateInventory = async () => {
        const snapshot = query(collection(firestore, 'ingredients'))
        const docs = await getDocs(snapshot)
        const inventoryList = []
        docs.forEach((doc) => {
            inventoryList.push({
                name: doc.id.toLowerCase(),
                ...doc.data(),
            })
        })
        setInventory(inventoryList)
    }

    const deleteItem = async (item) => {
        const docRef = doc(collection(firestore, 'ingredients'), item.toLowerCase())
        await deleteDoc(docRef)
        await updateInventory()
    }

    const removeItem = async (item) => {
        const docRef = doc(collection(firestore, 'ingredients'), item.toLowerCase())
        const docSnap = await getDoc(docRef)

        if(docSnap.exists()) {
            const {existingQuantity, existingUnit} = docSnap.data()
            if (quantity === 1) {
                await deleteDoc(docRef)
            }
            else {
                await setDoc(docRef, {quantity: existingQuantity-1, unit: existingUnit})
            }
        }

        await updateInventory()
    }

    const addItem = async (item, quantity, unit) => {
        const docRef = doc(collection(firestore, 'ingredients'), item.toLowerCase())
        const docSnap = await getDoc(docRef)

        if(docSnap.exists()) {
            const {existingQuantity, existingUnit} = docSnap.data()
            await setDoc(docRef, {quantity: existingQuantity+1, unit: existingUnit})
        }
        else {
            await setDoc(docRef, {quantity: quantity, unit: unit === "count" ? '' : unit })
        }

        await updateInventory()

    }


    function extractJSONArr(inputJSONStr) {
        const pattern = /\{[^{}]*/g
        const matches = inputJSONStr.matchAll(pattern)

        const JSONArr = []

        for (const match of matches) {
            const JSONStr = match[0]
            try {
                const JSONObj = JSON.parse(JSONStr)
                JSONArr.push(JSONObj)
            } catch (e) {
                if (e instanceof SyntaxError) {
                    // Extend the search for nested structures
                    const extendedJSONStr = extendSearch(inputJSONStr, match.index, inputJSONStr.length)
                    try {
                        const JSONObj = JSON.parse(extendedJSONStr)
                        JSONArr.push(JSONObj)
                    } catch (e) {
                        if (e instanceof SyntaxError) {
                            // Handle cases where the extraction is not valid JSON
                            continue
                        }
                    }
                }
            }
        }

        if (JSONArr.length > 0) {
            return JSONArr
        } else {
            return null  // Or handle this case as you prefer
        }

    }

    function extendSearch(text, startIndex, initialLength) {
        // Extend the search to try to capture nested structures
        let start = startIndex
        let end = startIndex + initialLength
        let nestCount = 0

        for (let i = start; i < text.length; i++) {
            if (text[i] === '{') {
                nestCount += 1
            } else if (text[i] === '}') {
                nestCount -= 1
                if (nestCount === 0) {
                    return text.substring(start, i + 1)
                }
            }
        }
        return text.substring(start, end)
    }

    const generateRecipes = async () => {

        const formattedIngredients = inventory.map(item => `${item.name} (${item.quantity} ${item.unit})`).join(', ')
        const prompt = `Give me a list of possible recipes that can be made from these ingredients (quantities also provided): ${formattedIngredients}. Provide the answer in this JSON schema: { "type" : "object", "properties" : { "recipe_name" : { "type" : "string" } } }. Do not return the JSON schema as part of the answer. Do not add any adjectives, extra words, additional descriptions, etc. to the recipe name, just give the name of the recipe.`
        const type = 'text'

        try {

            const response = await fetch('api/genai',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':'application/json'
                    },
                    body: JSON.stringify({prompt, type})
                }
            )

            const data = await response.json()

            if (response.ok) {
                const recipeArr = extractJSONArr(data.output)
                setRecipes(recipeArr)
            }
            else {
                console.error('Error:', data.error)
            }
        } catch(error) {
            console.error(error)
        }
    }

    const analyzeIngredientImage = async (image) => {

        const imageToAnalyze = {
            inlineData: {
                data: image.split(',')[1],
                mimeType: "image/jpeg"
            },
        }

        const prompt = `Analyze this food/ingredient image and provide: the name of the food/ingredient, how much of it their is, and the unit that it is measured in. Provide the answer in this JSON schema: { "type" : "object", "properties" : { "item_name" : { "type" : "string" }, "item_quantity" : { "type" : "integer" }, "item_unit" : { "type" : "string" } } }. Do not return the JSON schema as part of the answer. Do not add any extra text/descriptions to the values of each key in the JSON, just simply provide the name, quantity, and unit of measurement. The unit should be whichever one of these fits best: count (if unitless but can be physically counted), lb, kg, g, l, ml, or oz. If the quantity is hard to tell, just give the best approximate/guess of the value.`
        const type = 'image'

        try {

            const response = await fetch('api/genai',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':'application/json'
                    },
                    body: JSON.stringify({prompt, type, imageToAnalyze})
                }
            )

            const data = await response.json()

            if (response.ok) {
                const imageItem = extractJSONArr(data.output)[0]
                await addItem(imageItem.item_name, imageItem.item_quantity, imageItem.item_unit)
            }
            else {
                console.error('Error:', data.error)
            }
        } catch(error) {
            console.error(error)
        }
    }

    const handleOpenCamera = () => setCameraOn(true);
    const handleCloseCamera = () => setCameraOn(false);

    const handleOpen = () => setOpen(true)
    const handleClose = () => setOpen(false)

    useEffect(() => {
        updateInventory()
    }, []);

    return (
        <Box width="100vw" height="100vh" display="flex" flexDirection="column" justifyContent="center" alignItems="center" gap={3} bgcolor='#F0F0F0'>
            {/* TITLE */}
            <Typography color='#56494C' sx={{fontWeight:'bold'}} variant="h2">Pantry Tracker</Typography>

            {/* CONTENT */}
            <Box width="90%" height={{xs:'auto', md:'80%'}} display="flex" sx={{ flexDirection:{xs:'column', md:'row'}, alignItems:{xs:'center', md:'unset'}}} justifyContent='center' gap={3}>

                {/* INGREDIENTS SHOWCASE */}
                <Box width={{xs:'90%', md:'60%'}} >
                    <Paper elevation={4} sx={{ height:'100%', flex: 1, borderRadius: 3 }}>
                        <Box
                            bgcolor="#C2D3CD"
                            sx={{borderTopRightRadius:'12px', borderTopLeftRadius:'12px'}}
                            display="flex"
                            justifyContent="center"
                            alignItems="center"
                            padding={2.5}
                        >
                            <Stack width="100%" direction="row" justifyContent="space-between">
                                <Typography variant="h3" color='#56494C'>Ingredients</Typography>
                                <TextField
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': {
                                                borderColor: '#847E89', // Custom border color
                                            },
                                            '&:hover fieldset': {
                                                borderColor: '#56494C', // Border color on hover
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: '#56494C', // Border color when focused
                                            },
                                        },
                                    }}
                                    color='secondary'
                                    variant='outlined'
                                    placeholder="Filter"
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <FontAwesomeIcon icon={faSearch} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Stack>
                        </Box>
                        <Stack width="100%" height="90%" spacing={1} overflow="auto">
                            {inventory.filter(({ name }) => filter.toLowerCase() === name.slice(0, filter.length).toLowerCase()).map(({ name, quantity, unit }) => (
                                <Box
                                    key={name}
                                    width="100%"
                                    minHeight="50px"
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    padding={2}
                                    gap={2}
                                    bgcolor="#f0f0f0"
                                >
                                    <Typography variant="h5" color='#56494C' textAlign="left" width="20%">
                                        {name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                    </Typography>
                                    <Typography variant="h5" color='#56494C' textAlign="center">{quantity} {unit}</Typography>
                                    <Stack direction="row" spacing={2}>
                                        <IconButton size={'large'} sx={{boxShadow:'rgba(50, 50, 93, 0.25) 0px 6px 12px -2px, rgba(0, 0, 0, 0.3) 0px 3px 7px -3px', backgroundColor:'#9FA4A9', '&:hover':{ backgroundColor:'#56494C' } }} aria-label="add" onClick={() => addItem(name)}>
                                            <FontAwesomeIcon size={'xs'} icon={faAdd} />
                                        </IconButton>
                                        <IconButton size={'large'} sx={{boxShadow:'rgba(50, 50, 93, 0.25) 0px 6px 12px -2px, rgba(0, 0, 0, 0.3) 0px 3px 7px -3px', backgroundColor:'#9FA4A9', '&:hover':{ backgroundColor:'#56494C' } }} aria-label="subtract" onClick={() => removeItem(name)}>
                                            <FontAwesomeIcon size={'xs'} icon={faSubtract} />
                                        </IconButton>
                                        <IconButton size={'large'} sx={{boxShadow:'rgba(50, 50, 93, 0.25) 0px 6px 12px -2px, rgba(0, 0, 0, 0.3) 0px 3px 7px -3px', backgroundColor:'#9FA4A9', '&:hover':{ backgroundColor:'#56494C' } }} aria-label="delete" onClick={() => deleteItem(name)}>
                                            <FontAwesomeIcon size={'xs'} icon={faTrash} />
                                        </IconButton>
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                    </Paper>
                </Box>

                {/* RIGHT COLUMN */}
                <Box width={{xs:'90%', md:'40%'}} lex={1} display="flex" flexDirection="column" gap={3}>

                    {/* GENERATE RECIPES */}
                    <Paper elevation={4} sx={{ flex: 1, borderRadius: 3 }}>
                        <Box >
                            <Box
                                width="100%"
                                height="10%"
                                bgcolor="#C2D3CD"
                                sx={{borderTopRightRadius:'12px', borderTopLeftRadius:'12px'}}
                                display="flex"
                                justifyContent="center"
                                alignItems="center"
                                padding={2.5}
                            >
                                <Stack width="100%" direction="row" justifyContent="space-between">
                                    <Typography variant="h3" color='#56494C'>Recipes</Typography>
                                    <Button sx={{backgroundColor:'#9FA4A9', '&:hover':{ backgroundColor:'#56494C' } }} variant="contained" onClick={generateRecipes}>
                                        Generate
                                    </Button>
                                </Stack>
                            </Box>
                            <Stack width="100%" height="90%" maxHeight='450px' spacing={1} overflow='auto'>
                                {recipes.map((recipeJSON, index) => (
                                    <Box
                                        key={index}
                                        width="100%"
                                        minHeight="50px"
                                        display="flex"
                                        justifyContent="space-between"
                                        alignItems="center"
                                        padding={2}
                                        gap={2}
                                        bgcolor="#f0f0f0"
                                    >
                                        <Typography variant="h5" color='#56494C' textAlign="left">
                                            {recipeJSON.recipe_name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    </Paper>

                    {/* ADD ITEM MODAL BUTTONS */}
                    <Paper elevation={4} sx={{ height: '10%', display: 'flex', alignItems: 'center', borderRadius: 3 }}>
                        <Box sx={{ display: 'flex', width: '100%', height: '100%' }}>
                            <Box width="25%" height="100%" bgcolor="#C2D3CD" display="flex" alignItems="center" justifyContent="center" sx={{borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px'}}>
                                <Typography color='#56494C' variant="h5">Add Items</Typography>
                            </Box>
                            <Box width="75%" height="100%" display="flex" justifyContent="space-evenly" alignItems="center">
                                <Button sx={{backgroundColor:'#9FA4A9', '&:hover':{ backgroundColor:'#56494C' } }} variant="contained" size='large' onClick={handleOpen}>Manual</Button>
                                <Button sx={{backgroundColor:'#9FA4A9', '&:hover':{ backgroundColor:'#56494C' } }} variant="contained" size='large' onClick={handleOpenCamera}>Camera</Button>
                            </Box>
                        </Box>
                    </Paper>
                </Box>
            </Box>

            {/* MANUAL ITEM MODAL */}
            <Modal open={open} onClose={handleClose}>
                <Box
                    position="absolute"
                    top="50%"
                    left="50%"
                    sx={{ transform: 'translate(-50%, -50%)' }}
                    width="800px"
                    bgcolor="white"
                    boxShadow={24}
                    borderRadius={3}
                    p={4}
                    display="flex"
                    flexDirection="column"
                    gap={3}
                >
                    <Typography color='#56494C' sx={{fontWeight:'bold'}} variant="h5">Add Item (Manual)</Typography>
                    <Stack width="100%" direction="row" spacing={2} justifyContent="space-around">
                        <TextField
                            variant="outlined"
                            sx={{ width: '60%' }}
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                        />
                        <TextField
                            id="filled-number"
                            label="Number"
                            type="number"
                            InputLabelProps={{ shrink: true }}
                            variant="outlined"
                        />
                        <FormControl required sx={{ width: '20%' }}>
                            <InputLabel>Unit</InputLabel>
                            <Select
                                variant="outlined"
                                value={itemUnit}
                                onChange={(e) => setItemUnit(e.target.value)}
                                label="Unit *"
                            >
                                <MenuItem value="count">count</MenuItem>
                                <MenuItem value="lb">lb</MenuItem>
                                <MenuItem value="g">g</MenuItem>
                                <MenuItem value="kg">kg</MenuItem>
                                <MenuItem value="l">l</MenuItem>
                                <MenuItem value="ml">ml</MenuItem>
                                <MenuItem value="oz">oz</MenuItem>
                            </Select>
                        </FormControl>
                        <Button
                            sx={{backgroundColor:'#9FA4A9', '&:hover':{ backgroundColor:'#56494C' } }}
                            variant="contained"
                            onClick={() => {
                                addItem(itemName, itemUnit);
                                setItemName('');
                                setItemUnit('');
                                handleClose();
                            }}
                        >
                            Add
                        </Button>
                    </Stack>
                </Box>
            </Modal>

            {/* CAMERA ITEM MODAL */}
            <Modal open={cameraOn} onClose={handleCloseCamera}>
                <Box
                    position="absolute"
                    top="50%"
                    left="50%"
                    sx={{ transform: 'translate(-50%, -50%)' }}
                    width="35%"
                    height="70%"
                    bgcolor="white"
                    borderRadius={3}
                    boxShadow={24}
                    p={4}
                    display="flex"
                    flexDirection="column"
                    gap={3}
                >
                    <Typography color='#56494C' sx={{fontWeight:'bold'}} variant="h5" textAlign="center">Add Item (Camera)</Typography>
                    <Typography color='#56494C' sx={{fontWeight:'normal'}} variant="h9" textAlign="center">Take a picture of any ingredient to add to the pantry</Typography>
                    <Stack width="100%" direction="column" justifyContent="center" spacing={2}>
                        <Camera aspectRatio={4 / 3} ref={camera} errorMessages="Error with Camera" />
                        <Button
                            sx={{backgroundColor:'#9FA4A9', '&:hover':{ backgroundColor:'#56494C' } }}
                            variant="contained"
                            onClick={() => {
                                analyzeIngredientImage(camera.current.takePhoto())
                                handleCloseCamera()
                            }}
                        >
                            Take Pic
                        </Button>
                    </Stack>
                </Box>
            </Modal>
        </Box>
    );
}

export default Home;
