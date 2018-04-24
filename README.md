# app-portal
A simple portal for distributing mobile applications written in nodejs using mongodb.

----
Example config.json file placed in root-dir:
```json
{
  "title": "Mobile Portal",
  "token": "keyboard roll",
  "logo": "/logo.png",
  "username": "admin",
  "password": "Private!",
  "mongo" : {
    "database": "app-portal",
    "host": "localhost",
    "port": 27017
  }
}
```


License
=======

    Copyright 2016 Markus Maga

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
