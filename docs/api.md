# Payroll API Documentation

### About
The API returns data in JSON format. <br />
An API endpoint is authenticated (meaning: requires an authentication token) unless explicitly stated otherwise . <br />
An authenticated endpoint requires an access token to be specified under the `x-access-token` header.

All endpoints return data in the following format:
```json
{
    "payload": "",
    "error": "",
    "status": true
}
```

Field definitions:
```
payload     { object | array | string | number | boolean | null }
            The response payload.
            This is generally different for all requests, and is thus 
            documented separately for all endpoints.
          
error       { string | null }
            The error message.
            If an error had occurred, this will be a string 
            representing an error message. Otherwise this is always null.
          
status      { boolean }
            Whether the request was successful.
```

### Table of Contents
* [Statistics API](#statistics-api)
    * [Get platform statistics](#get-platform-statistics)
* [Authentication API](#authentication-api)
    * [Generate an access token](#generate-an-access-token)
    * [Verify an access token](#gerify-an-access-token)
* [User API](#user-api)
    * [Get all users](#get-all-users)
    * [Create a new user](#create-a-new-user)
    * [Get an individual user](#get-an-individual-user)
    * [Update a user](#update-a-user)
    * [Delete a user](#delete-a-user)
    * [Assign an access flag to a user](#assign-an-access-flag-to-a-user)
    * [Unassign an access flag from a user](#unassign-an-access-flag-from-a-user)
* [Access API](#access-api)
    * [Get all access groups](#get-all-access-groups)
    * [Get all access flags](#get-all-access-flags)
    * [Create a new access group](#create-a-new-access-group)
    * [Get an individual access group](#get-an-individual-access-group)
    * [Update an access group](#update-an-access-group)
    * [Assign an access flag to an access group](#assign-an-access-flag-to-an-access-group)
    * [Unassign an access flag from an access group](#unassign-an-access-flag-from-an-access-group)
    * [Delete an access group](#delete-an-access-group)
* [System API](#system-api)
    * [Get the system configuration](#get-the-system-configuration)
    * [Update the system configuration](#update-the-system-configuration)
    * [Remove a system configuration](#remove-a-system-configuration)
* [Holiday API](#holiday-api)
    * [Get the holidays in a certain country](#get-the-holidays-in-a-certain-country)
* [Work Event Generation API](#work-event-generation-api)
    * [Generate a list of work events](#generate-a-list-of-work-events)

## Statistics API
### Get platform statistics
#### Request
` GET /api/statistics`

#### Possible Responses
```
200 OK
    The request was successful.
401 Unauthorized
    The specified access token was invalid or expired
```

#### 200 OK Payload
```json
[
    [
        {
            "id": "",
            "name": "",
            "value": ""
        }
    ]
]
```
#### 200 OK Payload Definition
```
The payload is an array of datasets.
Each dataset is an array of statistics objects.
Each statistics object contains the following fields:
    id      { string }
            A unique identifier for the statistics object.
    
    name    { string }
            The name of the statistics object.
            This is displayed in the statistics dashboard as-is.
    
    value   { string | number }
            The data associated with the statistics object.
            This is displayed in the statistics dashboard as-is.
```

## Authentication API
### Generate an access token
#### `NOT AUTHENTICATED`

#### Request
`POST /api/auth`

#### Request Body
```json
{
    "login": "",
    "password": "",
    "token": ""
}

```
#### Request Body Field Definition
```
login       { string }
        The username or email of the user being authenticated.

password    { string }
        The password of the user being authenticated.

token       { string }
        The 6-character two-factor authentication token associated with the user being authenticated.
```

#### Possible Responses
```
200 OK
    The request was successful.
401 Unauthorized 
    The login, password, or token was invalid.
```

#### 200 OK Payload
```json
{
    "id": "", 
    "username": "", 
    "email": "", 
    "first_name": "", 
    "last_name": "", 
    "group": {
        "id": "",
        "tag": "",
        "name": "",
        "description": ""
    }, 
    "flags": [
        {
            "id": "",
            "flag": "",
            "name": "",
            "description": ""
        }
    ], 
    "auth": {
        "token": "",
        "expires": 0
    }
}
```

#### 200 OK Payload Definition
```
id                      { string }
                        The user's unique identifier
                        
username                { string }
                        The user's unique username
                        
email                   { string }
                        The user's email address
                        
first_name              { string }
                        The user's first name
                        
last_name               { string }
                        The user's last name
                        
group                   { object }
                        The group that the user is associated with
                        
group.id                { string }
                        The group's unique identifier
                        
group.tag               { string }
                        The group's unique tag
                        
group.name              { string }
                        The group's name
                        
group.description       { string }
                        The group's description
                        
flags                   { array }
                        An array containing all the access flags assigned to the user
                        
flags[n]                { object }
                        An access flag object
                        
flags[n].id             { string }
                        The access flag's unique identifier
                        
flags[n].flag           { string }
                        The access flag's unique string representation
                        
flags[n].name           { string }
                        The access flag's name
                        
flags[n].description    { string }
                        The access flag's description
                        
auth                    { object }
                        The authentication data object
                        
auth.token              { string }
                        The authentication token

auth.expires            { number }
                        The timestamp for when the token expires
```

### Verify an access token

#### Request
`GET /api/auth`

#### Possible Responses
```
200 OK
    The request was successful
401 Unauthorized
    The specified access token was invalid or expired
```

#### 200 OK Payload
```json
{
    "id": "", 
    "username": "", 
    "email": "", 
    "first_name": "", 
    "last_name": "", 
    "group": {
        "id": "",
        "tag": "",
        "name": "",
        "description": ""
    }, 
    "flags": [
        {
            "id": "",
            "flag": "",
            "name": "",
            "description": ""
        }
    ]
}
```

#### 200 OK Payload Definition
```
id                      { string }
                        The user's unique identifier
                        
username                { string }
                        The user's unique username
                        
email                   { string }
                        The user's email address
                        
first_name              { string }
                        The user's first name
                        
last_name               { string }
                        The user's last name
                        
group                   { object }
                        The group that the user is associated with
                        
group.id                { string }
                        The group's unique identifier
                        
group.tag               { string }
                        The group's unique tag
                        
group.name              { string }
                        The group's name
                        
group.description       { string }
                        The group's description
                        
flags                   { array }
                        An array containing all the access flags assigned to the user
                        
flags[n]                { object }
                        An access flag object
                        
flags[n].id             { string }
                        The access flag's unique identifier
                        
flags[n].flag           { string }
                        The access flag's unique string representation
                        
flags[n].name           { string }
                        The access flag's name
                        
flags[n].description    { string }
                        The access flag's description
```

## User API
### Get all users
#### Request
`GET /api/users`

#### Possible Responses
```
200 OK
    The request was successful
401 Unauthorized
    The specified access token was invalid or expired
```

#### 200 OK Payload
```json
[
    {
        "id": "", 
        "username": "", 
        "email": "", 
        "first_name": "", 
        "last_name": "", 
        "group": {
            "id": "",
            "tag": "",
            "name": "",
            "description": ""
        }, 
        "flags": [
            {
                "id": "",
                "flag": "",
                "name": "",
                "description": ""
            }
        ]
    }
]
```

#### 200 OK Payload Definition
```
The payload is an array of user objects.
Each user object contains the following fields:
    id                      { string }
                            The user's unique identifier
                            
    username                { string }
                            The user's unique username
                            
    email                   { string }
                            The user's email address
                            
    first_name              { string }
                            The user's first name
                            
    last_name               { string }
                            The user's last name
                            
    group                   { object }
                            The group that the user is associated with
                            
    group.id                { string }
                            The group's unique identifier
                            
    group.tag               { string }
                            The group's unique tag
                            
    group.name              { string }
                            The group's name
                            
    group.description       { string }
                            The group's description
                            
    flags                   { array }
                            An array containing all the access flags assigned to the user
                            
    flags[n]                { object }
                            An access flag object
                            
    flags[n].id             { string }
                            The access flag's unique identifier
                            
    flags[n].flag           { string }
                            The access flag's unique string representation
                            
    flags[n].name           { string }
                            The access flag's name
                            
    flags[n].description    { string }
                            The access flag's description
```

### Create a new user

#### Request
`POST /api/users`

#### Possible Responses
```
200 OK
    The request was successful
400 Bad Request
    The specified user data was invalid
401 Unauthorized
    The specified access token was invalid or expired
```

#### 200 OK Payload
```json
{
    "id": "", 
    "username": "", 
    "email": "", 
    "first_name": "", 
    "last_name": "", 
    "group": {
        "id": "",
        "tag": "",
        "name": "",
        "description": ""
    }, 
    "flags": [
        {
            "id": "",
            "flag": "",
            "name": "",
            "description": ""
        }
    ]
}
```

#### 200 OK Payload Definition
```
id                      { string }
                        The user's unique identifier
                        
username                { string }
                        The user's unique username
                        
email                   { string }
                        The user's email address
                        
first_name              { string }
                        The user's first name
                        
last_name               { string }
                        The user's last name
                        
group                   { object }
                        The group that the user is associated with
                        
group.id                { string }
                        The group's unique identifier
                        
group.tag               { string }
                        The group's unique tag
                        
group.name              { string }
                        The group's name
                        
group.description       { string }
                        The group's description
                        
flags                   { array }
                        An array containing all the access flags assigned to the user
                        
flags[n]                { object }
                        An access flag object
                        
flags[n].id             { string }
                        The access flag's unique identifier
                        
flags[n].flag           { string }
                        The access flag's unique string representation
                        
flags[n].name           { string }
                        The access flag's name
                        
flags[n].description    { string }
                        The access flag's description
```

#### 400 Bad Request Payload
```json
{
    "username": {
        "valid": false,
        "unique": false
    },
    "email": {
        "valid": false,
        "unique": false
    },
    "password": {
        "valid": false
    },
    "first_name": {
        "valid": false
    },
    "last_name": {
        "valid": false
    },
    "group": {
        "valid": false,
        "exists": false
    }
}
```

#### 400 Bad Request Payload Definition
```
username            { object }
                    The username validation object.

username.valid      { boolean }
                    Whether the username was valid.

username.unique     { boolean }
                    Whether the username was unique.

email               { object }
                    The email address validation object.

email.valid         { boolean }
                    Whether the email address was valid.

email.unique        { boolean }
                    Whether the email address was unique.

password            { object }
                    The password validation object.

password.valid      { boolean }
                    Whether the password was valid.

first_name          { object }
                    The first name validation object.

first_name.valid    { boolean }
                    Whether the first name was valid.

last_name           { object }
                    The last name validation object.

last_name.valid     { boolean }
                    Whether the last name was valid.

group               { object }
                    The group validation object.

group.valid         { boolean }
                    Whether the group was valid.

group.exists        { boolean }
                    Whether the group exists.

```

### Get an individual user

#### Request
`GET /api/users/:user`

#### Request Parameters
```
:user   The user's unique identifier
```

#### Possible Responses
```
200 OK
    The request was successful
401 Unauthorized
    The specified access token was invalid or expired
404 Not Found
    The user could not be found
```

#### 200 OK Payload
```json
{
    "id": "", 
    "username": "", 
    "email": "", 
    "first_name": "", 
    "last_name": "", 
    "group": {
        "id": "",
        "tag": "",
        "name": "",
        "description": ""
    }, 
    "flags": [
        {
            "id": "",
            "flag": "",
            "name": "",
            "description": ""
        }
    ]
}
```

#### 200 OK Payload Definition
```
id                      { string }
                        The user's unique identifier
                        
username                { string }
                        The user's unique username
                        
email                   { string }
                        The user's email address
                        
first_name              { string }
                        The user's first name
                        
last_name               { string }
                        The user's last name
                        
group                   { object }
                        The group that the user is associated with
                        
group.id                { string }
                        The group's unique identifier
                        
group.tag               { string }
                        The group's unique tag
                        
group.name              { string }
                        The group's name
                        
group.description       { string }
                        The group's description
                        
flags                   { array }
                        An array containing all the access flags assigned to the user
                        
flags[n]                { object }
                        An access flag object
                        
flags[n].id             { string }
                        The access flag's unique identifier
                        
flags[n].flag           { string }
                        The access flag's unique string representation
                        
flags[n].name           { string }
                        The access flag's name
                        
flags[n].description    { string }
                        The access flag's description
```

### Update a user

#### Request
`PUT /api/users/:user`

#### Possible Responses
```
200 OK
    The request was successful.
400 Bad Request
    The specified user data was invalid
401 Unauthorized
    The specified access token was invalid or expired
404 Not Found
    The user could not be found
```

#### 200 OK Payload
```json
{
    "id": "", 
    "username": "", 
    "email": "", 
    "first_name": "", 
    "last_name": "", 
    "group": {
        "id": "",
        "tag": "",
        "name": "",
        "description": ""
    }, 
    "flags": [
        {
            "id": "",
            "flag": "",
            "name": "",
            "description": ""
        }
    ]
}
```

#### 200 OK Payload Definition
```
id                      { string }
                        The user's unique identifier
                        
username                { string }
                        The user's unique username
                        
email                   { string }
                        The user's email address
                        
first_name              { string }
                        The user's first name
                        
last_name               { string }
                        The user's last name
                        
group                   { object }
                        The group that the user is associated with
                        
group.id                { string }
                        The group's unique identifier
                        
group.tag               { string }
                        The group's unique tag
                        
group.name              { string }
                        The group's name
                        
group.description       { string }
                        The group's description
                        
flags                   { array }
                        An array containing all the access flags assigned to the user
                        
flags[n]                { object }
                        An access flag object
                        
flags[n].id             { string }
                        The access flag's unique identifier
                        
flags[n].flag           { string }
                        The access flag's unique string representation
                        
flags[n].name           { string }
                        The access flag's name
                        
flags[n].description    { string }
                        The access flag's description
```

#### 400 Bad Request Payload
```json
{
    "username": {
        "valid": false,
        "unique": false
    },
    "email": {
        "valid": false,
        "unique": false
    },
    "password": {
        "valid": false
    },
    "first_name": {
        "valid": false
    },
    "last_name": {
        "valid": false
    },
    "group": {
        "valid": false,
        "exists": false
    }
}
```

#### 400 Bad Request Payload Definition
```
username            { object }
                    The username validation object.

username.valid      { boolean }
                    Whether the username was valid.

username.unique     { boolean }
                    Whether the username was unique.

email               { object }
                    The email address validation object.

email.valid         { boolean }
                    Whether the email address was valid.

email.unique        { boolean }
                    Whether the email address was unique.

password            { object }
                    The password validation object.

password.valid      { boolean }
                    Whether the password was valid.

first_name          { object }
                    The first name validation object.

first_name.valid    { boolean }
                    Whether the first name was valid.

last_name           { object }
                    The last name validation object.

last_name.valid     { boolean }
                    Whether the last name was valid.

group               { object }
                    The group validation object.

group.valid         { boolean }
                    Whether the group was valid.

group.exists        { boolean }
                    Whether the group exists.

```

### Delete a user

#### Request
`DELETE /api/users/:user`

#### Possible Responses
```
200 OK
    The request was successful
401 Unauthorized
    The specified access token was invalid or expired
404 Not Found
    The user could not be found
```

### Assign an access flag to a user

#### Request
`GET /api/users/:user/flags/:flag`

#### Request Parameters
```
:user   The user's unique identifier
:flag   The flag's unique string representation
```

#### Possible Responses
```
200 OK
    The request was successful
400 Bad Request
    The flag is invalid
401 Unauthorized
    The specified access token was invalid or expired
404 Not Found
    The user could not be found
```

#### 200 OK Payload
```json
{
    "id": "", 
    "username": "", 
    "email": "", 
    "first_name": "", 
    "last_name": "", 
    "group": {
        "id": "",
        "tag": "",
        "name": "",
        "description": ""
    }, 
    "flags": [
        {
            "id": "",
            "flag": "",
            "name": "",
            "description": ""
        }
    ]
}
```

#### 200 OK Payload Definition
```
id                      { string }
                        The user's unique identifier
                        
username                { string }
                        The user's unique username
                        
email                   { string }
                        The user's email address
                        
first_name              { string }
                        The user's first name
                        
last_name               { string }
                        The user's last name
                        
group                   { object }
                        The group that the user is associated with
                        
group.id                { string }
                        The group's unique identifier
                        
group.tag               { string }
                        The group's unique tag
                        
group.name              { string }
                        The group's name
                        
group.description       { string }
                        The group's description
                        
flags                   { array }
                        An array containing all the access flags assigned to the user
                        
flags[n]                { object }
                        An access flag object
                        
flags[n].id             { string }
                        The access flag's unique identifier
                        
flags[n].flag           { string }
                        The access flag's unique string representation
                        
flags[n].name           { string }
                        The access flag's name
                        
flags[n].description    { string }
                        The access flag's description
```

### Unassign an access flag from a user

#### Request
`DELETE /api/users/:user/flags/:flag`

#### Request Parameters
```
:user   The user's unique identifier
:flag   The flag's unique string representation
```

#### Possible Responses
```
200 OK
    The request was successful
400 Bad Request
    The flag is invalid
401 Unauthorized
    The specified access token was invalid or expired
404 Not Found
    The user could not be found
```

#### 200 OK Payload
```json
{
    "id": "", 
    "username": "", 
    "email": "", 
    "first_name": "", 
    "last_name": "", 
    "group": {
        "id": "",
        "tag": "",
        "name": "",
        "description": ""
    }, 
    "flags": [
        {
            "id": "",
            "flag": "",
            "name": "",
            "description": ""
        }
    ]
}
```

#### 200 OK Payload Definition
```
id                      { string }
                        The user's unique identifier
                        
username                { string }
                        The user's unique username
                        
email                   { string }
                        The user's email address
                        
first_name              { string }
                        The user's first name
                        
last_name               { string }
                        The user's last name
                        
group                   { object }
                        The group that the user is associated with
                        
group.id                { string }
                        The group's unique identifier
                        
group.tag               { string }
                        The group's unique tag
                        
group.name              { string }
                        The group's name
                        
group.description       { string }
                        The group's description
                        
flags                   { array }
                        An array containing all the access flags assigned to the user
                        
flags[n]                { object }
                        An access flag object
                        
flags[n].id             { string }
                        The access flag's unique identifier
                        
flags[n].flag           { string }
                        The access flag's unique string representation
                        
flags[n].name           { string }
                        The access flag's name
                        
flags[n].description    { string }
                        The access flag's description
```

## Access API
### Get all access groups

#### Request
`GET /api/groups`

#### Possible Responses
```
200 OK
    The request was successful
401 Unauthorized
    The specified access token was invalid or expired
```

#### 200 OK Payload
```json
[
    {
        "id": "",
        "tag": "",
        "name": "",
        "description": "",
        "flags": [
            {
                "id": "",
                "flag": "",
                "name": "",
                "description": ""
            }
        ]
    }
]
```

#### 200 OK Payload Definition
```
The payload is an array of group objects.
Each group object contains the following fields:
    id                    { string }
                          The group's unique identifier
                            
    tag                   { string }
                          The group's unique tag
                            
    name                  { string }
                          The group's name
                            
    description           { string }
                          The group's description
                            
    flags                 { array }
                          An array containing all the access flags assigned to the user
                            
    flags[n]              { object }
                          An access flag object
                            
    flags[n].id           { string }
                          The access flag's unique identifier
                            
    flags[n].flag         { string }
                          The access flag's unique string representation
                            
    flags[n].name         { string }
                          The access flag's name
                            
    flags[n].description  { string }
                          The access flag's description
```

### Get all access flags

#### Request
`GET /api/flags`

#### Possible Responses
```
200 OK
    The request was successful
401 Unauthorized
    The specified access token was invalid or expired
```

#### 200 OK Payload
```json
[
    {
        "id": "",
        "flag": "",
        "name": "",
        "description": ""
    }
]
```

#### 200 OK Payload Definition
```
The payload is an array of flag objects.
Each flag object contains the following fields:
    id              { string }
                    The access flag's unique identifier
                            
    flag            { string }
                    The access flag's unique string representation
                            
    name            { string }
                    The access flag's name
                            
    description     { string }
                    The access flag's description
```

### Create a new access group

#### Request
`POST /api/groups`

#### Possible Responses
```
200 OK
    The request was successful
400 Bad Request
    The specified group data was invalid
401 Unauthorized
    The specified access token was invalid or expired
```

#### 200 OK Payload
```json
{
    "id": "",
    "tag": "",
    "name": "",
    "description": "",
    "flags": [
        {
            "id": "",
            "flag": "",
            "name": "",
            "description": ""
        }
    ]
}
```

#### 200 OK Payload Definition
```
id                    { string }
                      The group's unique identifier
                        
tag                   { string }
                      The group's unique tag
                        
name                  { string }
                      The group's name
                        
description           { string }
                      The group's description
                        
flags                 { array }
                      An array containing all the access flags assigned to the user
                        
flags[n]              { object }
                      An access flag object
                        
flags[n].id           { string }
                      The access flag's unique identifier
                        
flags[n].flag         { string }
                      The access flag's unique string representation
                        
flags[n].name         { string }
                      The access flag's name
                        
flags[n].description  { string }
                      The access flag's description
```

#### 400 Bad Request Payload
```json
{
    "tag":         {
        "valid": false,
        "unique": false
    },
    "name":        {
        "valid": false,
        "unique": false
    },
    "description": {
        "valid": false
    }
}
```

#### 400 Bad Request Payload Definition
```
tag                 { object }
                    The group tag validation object

tag.valid           { boolean }
                    Whether the group tag is valid

tag.unique          { boolean }
                    Whether the group tag is unique
                
name                { object }
                    The group name validation object

name.valid          { boolean }
                    Whether the group tag is valid

name.unique         { boolean }
                    Whether the group tag is unique

description         { object }
                    The group description validation object

description.valid   { boolean }
                    Whether the group description is valid
```

### Get an individual access group

#### Request
`GET /api/groups/:group`

#### Request Parameters
```
:group  The group's unique identifier
```

#### Possible Responses
```
200 OK
    The request was successful
401 Unauthorized
    The specified access token was invalid or expired
404 Not Found
    The access group could not be found
```

#### 200 OK Payload
```json
{
    "id": "",
    "tag": "",
    "name": "",
    "description": "",
    "flags": [
        {
            "id": "",
            "flag": "",
            "name": "",
            "description": ""
        }
    ]
}
```

#### 200 OK Payload Definition
```
id                    { string }
                      The group's unique identifier
                        
tag                   { string }
                      The group's unique tag
                        
name                  { string }
                      The group's name
                        
description           { string }
                      The group's description
                        
flags                 { array }
                      An array containing all the access flags assigned to the user
                        
flags[n]              { object }
                      An access flag object
                        
flags[n].id           { string }
                      The access flag's unique identifier
                        
flags[n].flag         { string }
                      The access flag's unique string representation
                        
flags[n].name         { string }
                      The access flag's name
                        
flags[n].description  { string }
                      The access flag's description
```

### Update an access group

#### Request
`PUT /api/groups/:group`

#### Request Parameters
```
:group  The group's unique identifier
```

#### Possible Responses
```
200 OK
    The request was successful
400 Bad Request
    The specified group data was invalid
401 Unauthorized
    The specified access token was invalid or expired
404 Not Found
    The access group could not be found
```

#### 200 OK Payload
```json
{
    "id": "",
    "tag": "",
    "name": "",
    "description": "",
    "flags": [
        {
            "id": "",
            "flag": "",
            "name": "",
            "description": ""
        }
    ]
}
```

#### 200 OK Payload Definition
```
id                    { string }
                      The group's unique identifier
                        
tag                   { string }
                      The group's unique tag
                        
name                  { string }
                      The group's name
                        
description           { string }
                      The group's description
                        
flags                 { array }
                      An array containing all the access flags assigned to the user
                        
flags[n]              { object }
                      An access flag object
                        
flags[n].id           { string }
                      The access flag's unique identifier
                        
flags[n].flag         { string }
                      The access flag's unique string representation
                        
flags[n].name         { string }
                      The access flag's name
                        
flags[n].description  { string }
                      The access flag's description
```

#### 400 Bad Request Payload
```json
{
    "tag":         {
        "valid": false,
        "unique": false
    },
    "name":        {
        "valid": false,
        "unique": false
    },
    "description": {
        "valid": false
    }
}
```

#### 400 Bad Request Payload Definition
```
tag                 { object }
                    The group tag validation object

tag.valid           { boolean }
                    Whether the group tag is valid

tag.unique          { boolean }
                    Whether the group tag is unique
                
name                { object }
                    The group name validation object

name.valid          { boolean }
                    Whether the group tag is valid

name.unique         { boolean }
                    Whether the group tag is unique

description         { object }
                    The group description validation object

description.valid   { boolean }
                    Whether the group description is valid
```

### Assign an access flag to an access group

#### Request
`PUT /api/groups/:group/flags/:flag`

#### Request Parameters
```
:group  The group's unique identifier
:flag   The flag's unique string representation
```

#### Possible Responses
```
200 OK
    The request was successful
400 Bad Request
    The specified access flag is invalid
401 Unauthorized
    The specified access token was invalid or expired
404 Not Found
    The specified access group could not be found
```

#### 200 OK Payload
```json
{
    "id": "",
    "tag": "",
    "name": "",
    "description": "",
    "flags": [
        {
            "id": "",
            "flag": "",
            "name": "",
            "description": ""
        }
    ]
}
```

#### 200 OK Payload Definition
```
id                    { string }
                      The group's unique identifier
                        
tag                   { string }
                      The group's unique tag
                        
name                  { string }
                      The group's name
                        
description           { string }
                      The group's description
                        
flags                 { array }
                      An array containing all the access flags assigned to the user
                        
flags[n]              { object }
                      An access flag object
                        
flags[n].id           { string }
                      The access flag's unique identifier
                        
flags[n].flag         { string }
                      The access flag's unique string representation
                        
flags[n].name         { string }
                      The access flag's name
                        
flags[n].description  { string }
                      The access flag's description
```

### Unassign an access flag from an access group

#### Request
`DELETE /api/groups/:group/flags/:flag`

#### Request Parameters
```
:group  The group's unique identifier
:flag   The flag's unique string representation
```

#### Possible Responses
```
200 OK
    The request was successful
400 Bad Request
    The specified access flag is invalid
401 Unauthorized
    The specified access token was invalid or expired
404 Not Found
    The specified access group could not be found
```

#### 200 OK Payload
```json
{
    "id": "",
    "tag": "",
    "name": "",
    "description": "",
    "flags": [
        {
            "id": "",
            "flag": "",
            "name": "",
            "description": ""
        }
    ]
}
```

#### 200 OK Payload Definition
```
id                    { string }
                      The group's unique identifier
                        
tag                   { string }
                      The group's unique tag
                        
name                  { string }
                      The group's name
                        
description           { string }
                      The group's description
                        
flags                 { array }
                      An array containing all the access flags assigned to the user
                        
flags[n]              { object }
                      An access flag object
                        
flags[n].id           { string }
                      The access flag's unique identifier
                        
flags[n].flag         { string }
                      The access flag's unique string representation
                        
flags[n].name         { string }
                      The access flag's name
                        
flags[n].description  { string }
                      The access flag's description
```

### Delete an access group

#### Request
`DELETE /api/groups/:group`

#### Possible Responses
```
200 OK
    The request was successful
401 Unauthorized
    The specified access token was invalid or expired
404 Not Found
    The specified access group could not be found
```

## System API
### Get the system configuration

#### Request
`GET /api/system`

#### Possible Responses
```
200 OK
    The request was successful
401 Unauthorized
    The specified access token was invalid or expired
```

#### 200 OK Payload
```json
{
    "<setting>": "<value>"
}
```

#### 200 OK Payload Definition
```
Each field in the payload is a string representing the value of the setting.

<setting>   { string }
            The setting 
            
<value>     { string }
            The value of the setting
```

### Update the system configuration in bulk

#### Request
`PUT /api/system`

#### Request Body
```json
{
    "<setting>": "<value>"
}
```

#### Request Body Field Definition
```
Each field in the request body is a setting and it's value

<setting>   { string }
            The setting

<value>     { string }
            The value of the setting
```

#### Possible Responses
```
200 OK
    The request was successful
400 Bad Request
    The specified data was invalid
401 Unauthorized
    The specified access token was invalid or expired
```

#### 200 OK Payload
```json
{
    "<setting>": "<value>"
}
```

#### 200 OK Payload Definition
```
The payload contains all updated settings and their values
Each field in the payload is a string representing the value of the setting.

<setting>   { string }
            The new or updated setting
            
<value>     { string }
            The new value of the setting
```

#### 400 Bad Request Payload
```json
{
    "valid": false,
    "config": {
        "<setting>": false
    }
}
```

#### 400 Bad Request Payload Definition 
```
valid                   { boolean }
                        Whether the request body was a valid object

config                  { object }
                        The configuration validation object

config[<setting>]       { boolean }
                        Whether the specified value for <setting> was a valid string, boolean, or number
```

### Update the system configuration

#### Request
`PUT /api/system/:setting/:value`

#### Request Parameters
```
:setting    The setting to create or update
:value      The new value for the setting
```

#### Possible Responses
```
200 OK
    The request was successful
401 Unauthorized
    The specified access token was invalid or expired
```

#### 200 OK Payload
```json
{
    "setting": "<setting>",
    "value": "<value>"
}
```

#### 200 OK Payload Definition
```
The payload contains the updated setting and it's value

setting    { string }
            The new or updated setting 
            
<value>     { string }
            The new value of the setting
```

### Remove a system configuration

#### Request
`DELETE /api/system/?settings=setting1,setting2,settingN`

#### Query Parameters
```
settings    The comma-separated list of settings to remove
```

#### Possible Responses
```
200 OK
    The request was successful
401 Unauthorized
    The specified access token was invalid or expired
```

#### 200 OK Payload
```json
[
    "<setting1>",
    "<setting2>",
    "<settingN>"
]
```

#### 200 OK Payload Definition
```
The payload is an array of strings, each representing a deleted setting.
```

## Holiday API
### Get the holidays in a certain country

#### Request
`GET /api/holidays?country=XXX&year=YYYY`

#### Query Parameters
```
country     The ISO 3166-1 alpha-3 code for the country
year        The year (optional)
```

#### Possible Responses
```
200 OK
    The request was successful
400 Bad Request
    The specified country was invalid
401 Unauthorized
    The specified access token was invalid or expired
```

#### 200 OK Payload
```json
[
    {
        "date": {
            "day": 0,
            "month": 0,
            "year": 0,
            "dayOfWeek": 0
        },
        "localName": "",
        "englishName": ""
    }
]
```

#### 200 OK Payload Definition
```
The payload is an array of holiday objects.
Each holiday object contains the following fields:
    date            { object }
                    The object containing the day, month, year, and day of week for the holioday
    
    date.day        { number }
                    The date of the holiday (1-28/30/31)
    
    date.month      { number }
                    The month of the holiday (1-12)
    
    date.year       { number }
                    The year of the holiday
    
    date.dayOfWeek  { number }
                    The day of week of the holiday (1-7)
    
    localName       { number }
                    The name of the holiday, local to the country
    
    englishName     { number }
                    The name of the holiday, in English
```

## Work Event Generation API
### Generate a list of work events
 
#### Request
`POST /api/events`

#### Possible Responses
```
200 OK
    The request was successful
400 Bad Request
    The specified data was invalid
401 Unauthorized
    The specified access token was invalid or expired
```

#### 200 OK Payload
```json
{
    "period":   {
        "from": "02/03/1999",
        "to":   "02/03/2017"
    },
    "employee": {
        "name":        "",
        "income":      0,
        "work_start":  "00:00",
        "work_end":    "00:00",
        "lunch_start": "00:00",
        "lunch_end":   "00:00",
        "work_days":   [1, 2, 3, 4, 5, 6, 7]
    },
    "events":   [
        {
            "date": "01/01/1970",
            "event": "",
            "data": {
                "name": ""
            }
        }
    ]
}
```

#### 200 OK Payload Definition
```
period                  { object }
                        The generation period object

period.from             { string }
                        The date from which the generation started

period.to               { string }
                        The date at which the generation ended

employee                { object }
                        The employee data object

employee.name           { string }
                        The name of the employee

employee.income         { number }
                        The monthly income of the employee

employee.work_start     { string }
                        The time for when the employee starts work for the day (hh:mm format)

employee.work_end       { string }
                        The time for when the employee ends work for the day (hh:mm format)

employee.lunch_start    { string }
                        The time for when the employee goes to lunch (hh:mm format)

employee.lunch_end      { string }
                        The time for when the employee returns from lunch (hh:mm format)

employee.work_days      { array }
                        The array of the employee's work days

employee.work_days[n]   { number }
                        The day of week on which the employee works (1-7)

events                  { array }
                        The array of generated work events

events[n]               { object }
                        The generated work event object

events[n].date          { string }
                        The date of the work event (MM:DD:YYYY format) 

event[n].time           { string }
                        The time of the work event (hh:mm)
                        Note: This field is not present for events that last for the whole day (eg. holidays)

events[n].event         { string }
                        The type of event
                        The built-in event types are:
                            PAYDAY              The event that represents a payday.
                                                This event contains the following data:
                                                    amount      { number }
                                                                The amount paid to the employee
                                                    currency    { string }
                                                                The currency in which the employee was paid in
                                                
                            DAY_OFF             The event that represents a day off.
                                                This event is an all-day event.
                                                This event contains the following data:
                                                    name        { string }
                                                                The name of the event.
                                                                For personal holidays, this is always "Personal".
                                                                For days off work, this is always "Day off".
                                                                For public holidays, this is always the english name 
                                                                    of the public event.

                            ARRIVES_AT_WORK     The event that represents the employee arriving at work
                                                This event does not contain extra data.
                                                
                            LEAVES_FROM_WORK    The event that represents the employee leaving from work.
                                                This event does not contain extra data.
                                                                            
                            LEAVES_FOR_LUNCH    The event that represents the employee leaving for lunch.
                                                This event does not contain extra data.
                                                
                            ARRIVES_FROM_LUNCH  The event that represents the employee arriving from lunch.
                                                This event does not contain extra data.

events[n].data          { object }
                        The extra data associated with the event.
                        This is not present in all events (see above for details).
```