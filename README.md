# Payroll
A payroll application for Cloudator, created as part of an evaluation assignment.

### Requirements
```
Node.js (Tested on v7.9.0)
MongoDB (Tested on v2.4.9)
Redis   (Tested on v3.2.3)
```

### Documentation
Documentation for the REST API can be found in  
[https://github.com/xprn/payroll/blob/master/docs/api.md](https://github.com/xprn/payroll/blob/master/docs/api.md)

### Installation
To install this application, please follow these steps:
```shell
# Navigate to where you'd like to install the application
cd /home/xprn

# Clone the Git repository
git clone https://github.com/xprn/payroll.git ./payroll

# Navigate inside the directory
cd payroll

# Run the setup script
npm run setup

# The setup script will install all the NPM dependencies, 
# and will also start a simple installation server.
# Once the setup server is started, it will guide you through
# the setup process.

# After setup has been completed, start the server itself
npm run start
```