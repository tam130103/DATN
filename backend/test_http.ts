import axios from 'axios';

async function testHttpLayer() {
  try {
    // We already have a fb bot user that is admin maybe? 
    // Wait, let me just login as an admin if I can find one. 
    // Or I'll directly inject an admin token from backend DB by signing it!
  } catch (error) {
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
}
testHttpLayer();
