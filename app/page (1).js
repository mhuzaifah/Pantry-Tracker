'use client'
import {useState, useEffect, useRef} from "react";
import {firestore} from '@/firebase'
import {collection, query, getDocs, getDoc, doc, deleteDoc, setDoc} from 'firebase/firestore';
import {Box, Button, InputAdornment, Modal, Stack, TextField, Typography} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import {Camera} from "react-camera-pro";
import {generateRecipes} from "@/app/image_detection.js";

export default function Home() {

    /* Inventory Vars */
    const [inventory, setInventory] = useState([]);
    const [open, setOpen] = useState(false);
    const [itemName, setItemName] = useState('');
    const [filter, setFilter] = useState('');

    /* Camera Vars */
    const [cameraOn, setCameraOn] = useState(false);
    const camera = useRef(null);
    const [image, setImage] = useState(null);

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

    const removeItem = async (item) => {
        const docRef = doc(collection(firestore, 'ingredients'), item.toLowerCase())
        const docSnap = await getDoc(docRef)

        if(docSnap.exists()) {
            const {quantity} = docSnap.data()
            if (quantity === 1) {
                await deleteDoc(docRef)
            }
            else {
                await setDoc(docRef, {quantity: quantity-1})
            }
        }

        await updateInventory()

    }

    const addItem = async (item) => {
        const docRef = doc(collection(firestore, 'ingredients'), item.toLowerCase())
        const docSnap = await getDoc(docRef)

        if(docSnap.exists()) {
            const {quantity} = docSnap.data()
            await setDoc(docRef, {quantity: quantity+1})
        }
        else {
            await setDoc(docRef, {quantity: 1})
        }

        await updateInventory()

    }

    const handleOpenCamera = () => setCameraOn(true);
    const handleCloseCamera = () => setCameraOn(false);

    const handleOpen = () => setOpen(true)
    const handleClose = () => setOpen(false)

    useEffect(() => {
        updateInventory()
    }, []);

    return (
      <Box width='100vw' height='100vh' display='flex' flexDirection='column' justifyContent='center' alignItems='center' gap={10} >
          {/* TITLE */}
          <Typography variant='h2' >Pantry Tracker</Typography>
          {/* CONTENT */}
          <Box height='60%' width='auto' display='flex' justifyContent='space-between' >
              {/* INGREDIENTS SHOWCASE */}
              <Box border='1px solid #333' >
                  <Box
                      width='800px'
                      height='20%'
                      bgcolor='#ADD8E6'
                      display='flex'
                      justifyContent='center'
                      alignItems='center'
                      padding={2.5}
                  >
                      <Stack width='100%' direction='row' justifyContent='space-between' >
                          <Typography variant='h3' color='#111' >Ingredients</Typography>
                          <TextField
                              variant='outlined'
                              placeholder='Search'
                              value={filter}
                              onChange={(e) => {
                                  setFilter(e.target.value)
                              }}
                              // InputProps={
                              //     {startAdornment: (<InputAdornment position='start'> <SearchIcon></SearchIcon> </InputAdornment>)}
                              // }
                          ></TextField>
                      </Stack>
                  </Box>
                  <Stack width='100%' height='80%'  spacing={1} overflow='auto' >
                      {
                          inventory.filter(({name}) => filter.toLowerCase() === name.slice(0,filter.length).toLowerCase()).map( ({name, quantity}) => (
                              <Box
                                  key={name}
                                  width='100%'
                                  minHeight='50px'
                                  display='flex'
                                  justifyContent='space-between'
                                  alignItems='center'
                                  padding={5}
                                  gap={5}
                                  bgColor='#f0f0f0'
                              >
                                  <Typography variant='h4' color='#333' textAlign='left'
                                              width='20%'>{name.charAt(0).toUpperCase() + name.slice(1)}</Typography>
                                  <Typography variant='h5' color='#333' textAlign='center'>{quantity}</Typography>
                                  <Stack direction='row' spacing={1}>
                                      <Button variant='contained' onClick={() => addItem(name)}>+</Button>
                                      <Button variant='contained' onClick={() => removeItem(name)}>-</Button>
                                  </Stack>
                              </Box>
                          ))
                      }
                  </Stack>
              </Box>
              {/* GENERATE RECIPES */}
              <Box border='1px solid #333' >
                  <Box
                      width='350px'
                      height='20%'
                      bgcolor='#ADD8E6'
                      display='flex'
                      justifyContent='center'
                      alignItems='center'
                      padding={2.5}
                  >
                      <Stack width='100%' direction='row' justifyContent='space-between' >
                          <Typography variant='h5' color='#111' >Recipes</Typography>
                          <Button variant='contained' onClick={() => generateRecipes(inventory)} >
                              Generate
                          </Button>
                      </Stack>
                  </Box>
                  <Stack width='100%' height='80%'  spacing={1} overflow='auto' >
                      <Typography>{}</Typography>
                  </Stack>
              </Box>
          </Box>
          {/* ITEM MODAL */}
          <Modal open={open} onClose={handleClose}>
              <Box
                  position='absolute'
                  top='50%'
                  left='50%'
                  sx={{
                      transform:'translate(-50%, -50%)'
                  }}
                  width='400'
                  bgcolor='white'
                  border='2px solid #000'
                  boxShadow={24}
                  p={4}
                  display='flex'
                  flexDirection='column'
                  gap={3}
              >
                  <Typography variant='h5' >Add Item</Typography>
                  <Stack width='100%' direction='row' spacing={2} >
                      <TextField
                          variant='outlined'
                          fullWidth
                          value={itemName}
                          onChange={(e) => {
                              setItemName(e.target.value)
                          }}
                      />
                      <Button
                          variant='outlined'
                          onClick={() => {
                              addItem(itemName)
                              setItemName('')
                              handleClose()
                          }}
                      >Add</Button>
                  </Stack>
              </Box>
          </Modal>
          {/* CAMERA MODAL */}
          <Modal open={cameraOn} onClose={handleCloseCamera}>
              <Box
                  position='absolute'
                  top='50%'
                  left='50%'
                  sx={{
                      transform:'translate(-50%, -50%)'
                  }}
                  width='35%'
                  height='70%'
                  bgcolor='white'
                  border='2px solid #000'
                  boxShadow={24}
                  p={4}
                  display='flex'
                  flexDirection='column'
                  gap={3}
              >
                  <Typography variant='h5' textAlign='center' >Camera</Typography>
                  <Typography variant='h9' textAlign='center' >Take a picture of any ingredient to add to pantry</Typography>
                  <Stack width='100%' direction='column' justifyContent='center' spacing={2} >
                      <Camera aspectRatio={4/3} ref={camera}  errorMessages='Error with Camera' />
                      <Button
                          variant='outlined'
                          onClick={() => {
                              setImage(camera.current.takePhoto())
                              handleCloseCamera()
                          }}
                      >Take Pic</Button>
                  </Stack>
              </Box>
          </Modal>
          {/* POPUP MODAL BUTTONS */}
          <Box width='100%' display='flex' justifyContent='space-evenly' >
              <Button
                  variant='contained'
                  onClick={() => {
                      handleOpen()
                  }}
              >Add New Item</Button>
              <Button
                  variant='contained'
                  onClick={() => {
                      handleOpenCamera()
                  }}
              >Camera</Button>
          </Box>
      </Box>
    );
}
