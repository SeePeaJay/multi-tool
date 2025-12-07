# multi-tool

**Multi-Tool** is my knowledge management system.

It includes the core capabilities you’d expect from such a platform, like:
- block-based editor - notes are made up of blocks that are draggable within the editor
- block-level references - links can point to a specific block
- tagging - tags can be inserted at the page level or at the block level

Additionally, it is deliberately opinionated to mirror my personal workflow. This means certain features or behaviours may be experimental and evolving. A glossary of terms, feature descriptions, and design rationales can be found at: ...

## Development
Follow these steps to get the app running locally:
### 1. Pre-requisites
- Make sure you have `git` and `npm` installed.
- Clone the project with `git clone https://github.com/SeePeaJay/multi-tool.git`
- Then from the project root, run: `npm install`
	- (this installs deps for all packages since root package.json declares the workspaces)

### 2. Setup environment for frontend & backend
To run the frontend with the backend, environment variables must be set for Google Authentication — currently the only supported authentication method.

#### 1. Create OAuth credentials in Google Cloud
* Go to the Google Cloud Console.
* Create a new **Client ID** for a Web Application.
* Set **Authorized JavaScript origins**. localhost and localhost 5173 since vite
* Save both the **Client ID** and **Client Secret** for below.

#### 2. Configure frontend env variables
Inside the `client` directory, create a `.env` file:
```
cd client
touch .env
```

Add the following variable (replace with your actual Client ID):
```
VITE_CLIENT_ID=your_client_id_here
```

#### 3. Configure backend env variables
Inside the `server` directory, create a `.env` file:
```
cd server
touch .env
```

Add the following variables:
```
CLIENT_ID=your_client_id_here
CLIENT_SECRET=your_client_secret_here
```

### 3. Run the frontend only
* From project root, run `cd client` to navigate to the `client` directory.
* Then, start the development server with `npm run dev`

### 4. Run with the backend (server)
* From project root, run `cd server` to navigate to the `server` directory.
* Then, start the server with `npm run dev`

### 5. Run Cypress component tests
* Run `npx cypress open` in the `client` directory to launch Cypress.

## Deployment
This project ships with a ready-to-use Docker setup for production. To deploy your own instance of the app:

### 1. Pre-requisites
- Make sure you have `git`, `npm`, and `docker` installed.
- Clone the project with `git clone https://github.com/SeePeaJay/multi-tool.git`

### 2. Setup environment for frontend & backend
Same as in Development, we need to set up some env variables before deployment.
#### 1. Ensure OAuth credentials are created in Google Cloud
Follow step 2.1 from Development.

#### 2. Configure frontend args in `compose.yaml`
Modify the following variable (replace with your actual Client ID):
```
VITE_CLIENT_ID:...
```

Adjust collaboration url accordingly:
```
VITE_COLLAB_URL:...
```

#### 3. Configure backend env variables
Same as step 2.3 from Development.

### 3. Run the app
* Run `docker compose up` to start the service.

## Learn more
* main website:
* detailed features and terminology:
* architecture:
