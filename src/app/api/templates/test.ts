/**
 * This is a simple script to test the templates API
 * Not intended for production use
 */

// Function to test GET endpoint
async function testGetTemplates() {
  try {
    const response = await fetch('/api/templates');
    if (!response.ok) {
      throw new Error(`Error fetching templates: ${response.statusText}`);
    }
    const templates = await response.json();
    console.log('Templates:', templates);
    return templates;
  } catch (error) {
    console.error('Error testing GET /api/templates:', error);
    throw error;
  }
}

// Function to test POST endpoint
async function testSaveTemplate() {
  try {
    const templateData = {
      name: "API Test Template",
      content: "This is a test template created via the API",
      category: "API Testing"
    };

    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templateData),
    });

    if (!response.ok) {
      throw new Error(`Error saving template: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Template saved:', result);
    return result;
  } catch (error) {
    console.error('Error testing POST /api/templates:', error);
    throw error;
  }
}

export { testGetTemplates, testSaveTemplate }; 