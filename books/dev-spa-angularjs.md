# Developing Single-Page Application with AngularJS

> This guide was written for instapack 4, is outdated, and discontinued. However, the content should still be mostly correct!

> You should try the newer [Developing Single-Page Application with Vue.js](https://github.com/ryanelian/instapack/blob/master/books/dev-spa-vue.md) guide!

## Getting Started

`ipack new angular-material`

Use your favorite back-end technology and reference instapack build artefacts. If you are not familiar, read the [basic tutorial using ASP.NET Core MVC](tutorial-asp-net-core-mvc.md).

Your JavaScript project structure should look like this:

```
client/js/
│   angular-project.ts
│   index.ts
├───components
│       Hello.html
│       Hello.ts
│       Home.html
│       Home.ts
│       index.ts
│       ValidationMessage.html
│       ValidationMessage.ts
├───models
│       index.ts
│       SampleModel.ts
├───services
│       index.ts
│       SampleService.ts
└───states
        index.ts
```

## Modules

Open `angular-project.ts`, which is imported by `index.ts`. An AngularJS application consists of modules:

```ts
let app = angular.module('aspnet', [animate, aria, messages, sanitize, material, router.default]);
```

The modules listed are imported from `node_modules`, which are resolved as strings:

```ts
import * as animate from 'angular-animate';     // 'angular-animate'
import * as aria from 'angular-aria';           // 'angular-aria'
import * as messages from 'angular-messages';   // 'angular-messages'
import * as sanitize from 'angular-sanitize';   // 'angular-sanitize'
import * as material from 'angular-material';   // 'ngMaterial'
import * as router from '@uirouter/angularjs';  // router.default = 'ui.router'
```

> **Newbie trap:** `module` method with array as second parameter **declares** a module using a given name, while `module` method without a second parameter **retrieves** an existing module of the said name.

With our registered `aspnet` module, auto-bootstrap your application by using `ng-app` directive / attribute with `aspnet` as parameter on your HTML:

```html
<div ng-app="aspnet" ng-cloak>
    <!-- AngularJS code work here! -->
    <p>{{1 + 1}}</p>
</div>
```

If everything goes well, the expression within the double curly braces inside the paragraph tag will be evaluated to `2`.

You can also manually bootstrap the application instead of using `ng-app` directive:

```js
angular.element(document).ready(function() {
    angular.bootstrap(document, ['aspnet']);
});
```

> Manual bootstrap might be useful if you need to perform asynchronous operation before AngularJS compiles the page.

## Components

A component allows you to develop a reusable HTML tag for use within your AngularJS application. In `angular-project.ts`, you should find the following lines:

```ts
import * as components from './components';
import * as services from './services';
import * as states from './states';
```

These imports refer to `index.ts` in respective folders. Open `components/index.ts` and add the following lines:

```ts
export * from './Sum'
```

Then create new file `Sum.ts` in the same `components` folder.
- Doing so tells TypeScript to re-export the modules exported from `Sum.ts`.
- This technique allows adding more components into the application while keeping its source code well-organized.

Write the following code in `Sum.ts`:

```ts
export let SumComponent: angular.IComponentOptions = {
    template: require('./Sum.html')
};
```

> Technically, you do not need to type-hint `angular.IComponentOptions`. However, doing so provides clarity to the source code and serves as a documentation!

instapack supports HTML template compilation for convenience. `Sum.html` next to `Sum.ts` will be stringified, minified, then exported as a module. Make a new file `Sum.html` next to `Sum.ts` file:

```html
<p>{{1 + 1}}</p>
```

Return to `angular-project.ts`. Add the following line below our module declaration:

```ts
app.component('sum', components.SumComponent);
```

Now we can use our newly created component as HTML tag `<sum></sum>`. Try it!

## Controllers

Controller allows adding code-behind for the component view. Revisit `Sum.ts` and change the code to:

```ts
class SumController implements angular.IController {
    $onInit() {
    }
}

export let SumComponent: angular.IComponentOptions = {
    template: require('./Sum.html'),
    controller: SumController,
    controllerAs: 'me',
    bindings: {
        a: '<',
        b: '<'
    }
};
```

Explanation:

- `SumController` is a basic class, which contains the following methods:

    - `$onInit()` is executed when the component is ready. **You should never run initialization logic in controller class constructor!**

    - Like components, `implements angular.IController` is technically not required, but encouraged for source code clarity and documentation.

- `SumComponent` uses `SumController` as its controller.

- `SubComponent` view can access controller class members by using `me`. (If not provided, defaults to `$ctrl`)

- Binds `SubComponent` parameters `a` and `b` as controller properties. When binding parameters, the following modes are supported:

    - `=` two-way data binding. Allows passing an object reference to a child component. Changes to object values will update the parent scope.

    - `<` one-way data binding. Allows passing an object reference to a child component. However, changes to object will not update the parent scope.

    - `@` string binding. Allows passing a raw string into a component. Use `{{ }}` within the parameter to evaluate values to be passed as a string.

    - `&` callback binding. Allows passing a function into a child component.

With that knowledge, we can change the `Sum.html` template to:

```html
<p>{{me.a + me.b}}</p>
```

Try calling `<sum a="2" b="3"></sum>`. If done correctly, the web page should display `5`.

## View Directives

Most common AngularJS directives are listed in this page: https://docs.angularjs.org/api/ng/directive

For the sake of guide completeness, fundamental view directives will be reviewed in this chapter.

### Control Structures

#### Conditions

```html
<div ng-if="true"></div>
<div ng-show="true"></div>
<div ng-hide="false"></div>
```

The above directives will render the tag if parameter condition evaluates to [truthy](https://developer.mozilla.org/en/docs/Glossary/Truthy) (or [falsy](https://developer.mozilla.org/en-US/docs/Glossary/Falsy) for `ng-hide`).

The difference between [`ng-if`](https://docs.angularjs.org/api/ng/directive/ngIf) and [`ng-show`](https://docs.angularjs.org/api/ng/directive/ngShow) / [`ng-hide`](https://docs.angularjs.org/api/ng/directive/ngHide), is the former **erases** the DOM tree when not displaying the element, while the latter uses CSS `display: none` property.
- `ng-if` can be used to reduce memory usage by reducing the amount of hidden elements in the application.
- `ng-show` / `ng-hide` should be used when recreating the DOM tree is slow (e.g. expensive initialization logic in nested components' controllers). 

```html
<div ng-switch="me.value">
    <div ng-switch-when="1"></div>
    <div ng-switch-when="2"></div>
    <div ng-switch-default></div>
</div>
```

[`ng-switch`](https://docs.angularjs.org/api/ng/directive/ngSwitch) behaves like `ng-if` by swapping DOM tree to matching template in accordance to `ng-switch-when` parameter, similar to [switch-case](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/switch) logic. 

#### Loop

```html
<p ng-repeat="student in me.students track by student.studentId">
    {{ student.name }}
</p>
```

[`ng-repeat`](https://docs.angularjs.org/api/ng/directive/ngRepeat) iterates through every element in a collection. Each loop creates a new element instance with its own scope and variable. `track by` statement must be provided with a unique key of an element (use `$index` when no such key exists).

> **ALWAYS** have `track by` when iterating a collection. If `track by` is missing, the directive will recreate all elements on change, which translates to **heavy performance penalty**!

Within the loop template, these special properties can also be accessed:

- `$index` starts from 0 to array length -1.

- `$first` is `true` if current element is the first item in iteration.

- `$last` is `true` if current element is the last item in iteration.

- `$middle` = `!$first && !$last`

- `$even` = `$index % 2 == 0`

- `$odd` = `$index % 2 == 1`

#### Loop Filters

Filters may be applied to provide declarative client-side search from the collection. Multiple filters can be chained together using the pipe `|` symbol.

> `track by` must always be the last expression in the repeat directive parameter!

```html
<p>
    <input ng-model="wildcard" />
</p>

<p ng-repeat="student in me.students | filter:wildcard track by student.studentId"></p>
```

The above [`filter:`](https://docs.angularjs.org/api/ng/filter/filter) example will return search results containing the input from the textbox from any property. A search keyword `234` will return a student with property `phone: '123456789'`.

```html
<p>
    <input ng-model="search.name" />
</p>

<p ng-repeat="student in me.students | filter:search:true track by student.studentId"></p>
```

In contrast, the above example allows precision search by returning only results with **matching property** (e.g. the object passed is `{ name: '...' }`) and **strict equality** mode enabled (`:true`).

A student with property `name: 'Sherlock Holmes'` will only be returned if the search keyword is also `Sherlock Holmes`.

```html
<p>
    <input ng-model="me.search" />
</p>

<p ng-repeat="student in me.students | filter:me.customSearch track by student.studentId"></p>
```

```ts
class StudentController implements angular.IController {

    search: string;

    // IMPORTANT: a filter must NOT be a method, but a callback.
    customSearch = (student) => {
        return student.name.toLowerCase().startsWith(search.toLowerCase());
    };
}
```

The above example demonstrates how to create a custom search by creating a callback which accepts an item and returns a boolean.

In addition, you can also use [`orderBy`](https://docs.angularjs.org/api/ng/filter/orderBy) filter to perform sorting:

```html
<p ng-repeat="student in me.students | orderBy:'name' track by student.studentId">
    <!-- Order by name property, ascending -->
</p>
<p ng-repeat="student in me.students | orderBy:['name', 'studentId'] track by student.studentId">
    <!-- Order by name property, then by studentId (both ascending) -->
</p>
<p ng-repeat="student in me.students | orderBy:'-name' track by student.studentId">
    <!-- Order by name property, descending -->
</p>
<p ng-repeat="student in me.students | orderBy:'name':true track by student.studentId">
    <!-- Order by name property (ascending), then reverse the result -->
</p>
```

And use [`limitTo`](https://docs.angularjs.org/api/ng/filter/limitTo) filter to perform pagination:

```html
<p>
    <input ng-model="me.page" type="number" />
</p>
<p ng-repeat="student in me.students | orderBy:'name' | limitTo:me.take:me.skip() track by student.studentId"></p>
```

```ts
class StudentController implements angular.IController {

    // Get array values from a web service.
    students: Student[];
    
    page: number;

    // Items per page
    take = 10;

    skip() {
        if (!this.page) {
            return 0;
        }
        return (this.page - 1) * this.take;
    }
}
```

Use `as` to store filter results into a temporary variable, if needed.

```html
<p ng-repeat="student in me.students | filter:'Ryan' | orderBy:'name' | limitTo:10:20 as results track by student.studentId">
    <!-- filter results are stored into 'results' variable -->
</p>
```

### Data Directives

#### Model & Expression Binders

```html
<p>
    <input ng-model="test" />
</p>
<p>
    <input ng-value="test" />
</p>
<p>{{ test }}</p>
<p ng-bind="test"></p>
<p ng-bind-html="test"></p>
<p ng-non-bindable>{{test}}</p>
```

- [`ng-model`](https://docs.angularjs.org/api/ng/directive/ngModel) allows two-way model binding against an input.
    - Control value manipulation from UI via user action will change backing model data and programmatic changes to model value will be reflected to the UI.
    - You can customize input behavior by using [`ng-model-options`](https://docs.angularjs.org/api/ng/directive/ngModelOptions) directive (can be globally applied by placing on the root element of the application).

- In contrast, [`ng-value`](https://docs.angularjs.org/api/ng/directive/ngValue) allows one-way binding from the model to the UI but not the other way around.

- Double curly brackets / markup notation [`{{ }}`](https://docs.angularjs.org/guide/templates) evaluates expression within. The result will replace the markup.

- [`ng-bind`](https://docs.angularjs.org/api/ng/directive/ngBind) evaluates the expression passed in parameter, then replaces the content of the element with the result.
    - However, unlike markup, `ng-bind` **is much faster** (about 20% faster).
    - Markup is dirty checked every `$digest` cycle, even when not needed.
    - `ng-bind` places a watcher on passed variables, which will only fire when the passed value actually changes.

- [`ng-bind-html`](https://docs.angularjs.org/api/ng/directive/ngBindHtml) behaves like `ng-bind`, but does not escape the resulting string. To use this directive, [`angular-sanitize`](https://www.npmjs.com/package/angular-sanitize) must be added to application module dependencies. The directive will securely sanitize the output then treats it as an injected HTML code.

- [`ng-non-bindable`](https://docs.angularjs.org/api/ng/directive/ngNonBindable) tells AngularJS to ignore / not compile the tag content. This is useful for displaying contents which appeared to be AngularJS code, such as snippets.

#### Attribute Changers

These directives should be used instead of their standard HTML attribute counterparts due to technical reasons.

```html
<p>
    <a ng-href="profile/{{value}}">
    <!-- If you use href, the link may not work! -->
</p>
<p>
    <img ng-src="profile-image/{{value}}.jpg"/>
    <!-- If you use src, the image may not load! -->
</p>
<div>
    <!-- These directives evaluate the expression in parameter to boolean. -->

    <button type="button" ng-disabled="!value">OK</button>
    <label><input type="checkbox" ng-checked="value">Has value?</label>
    <input ng-readonly="true" value="Hello World!" />

    <select>
        <option ng-selected="!value">No value...</option>
        <option ng-selected="value">Has value!</option>
    </select>
    
    <details id="details" ng-open="false">
        <summary>List</summary>
        <ul>
            <li>Apple</li>
            <li>Orange</li>
            <li>Durian</li>
        </ul>
    </details>
</div>
```

Read more:
- https://docs.angularjs.org/api/ng/directive/ngHref
- https://docs.angularjs.org/api/ng/directive/ngSrc
- https://docs.angularjs.org/api/ng/directive/ngSrcset
- https://docs.angularjs.org/api/ng/directive/ngDisabled
- https://docs.angularjs.org/api/ng/directive/ngChecked
- https://docs.angularjs.org/api/ng/directive/ngReadonly
- https://docs.angularjs.org/api/ng/directive/ngSelected
- https://docs.angularjs.org/api/ng/directive/ngOpen

> Obviously, you should not use `ng-checked` and `ng-selected` if you are planning to interact with user input, but instead use `ng-model`. These directives are bound one-way and will not update the backing model!

> `<details>` is not supported in IE and Edge browsers. Use polyfill when needed: https://github.com/javan/details-element-polyfill

#### CSS Class Changers

[`ng-class`](https://docs.angularjs.org/api/ng/directive/ngClass) accepts a string-boolean key-value-pair / map / dictionary parameter, which will be used for dynamically setting CSS classes into an element. `ng-class` also accepts and evaluates string and string array.

```html
<p ng-class="me.classMap">Class Map</p>
<!-- CSS class will be set to "a c" -->

<p ng-class="[me.class1, me.class2]">String Array</p>
```

```ts
class MyController implements angular.IController {

    class1 = 'a';
    class2 = 'b';

    classMap = {
        'a': true,
        'b': false,
        'c': true
    };
}
```

[`ng-class-odd`](https://docs.angularjs.org/api/ng/directive/ngClassOdd) and [`ng-class-even`](https://docs.angularjs.org/api/ng/directive/ngClassEven) behave exactly like `ng-class`, except they only work within `ng-repeat` template scope, for rows with either `$odd` or `$even` evaluated as true.

```html
<div ng-repeat="name in me.names track by $index">
    <p ng-class-odd="'odd'" ng-class-even="'even'" ng-bind="name"></p>
</div>
```

> For simple cases, you should probably use CSS rule instead for better performance:

```css
p.namez:nth-child(odd) {
    background: red;
}

p.namez:nth-child(even) {
    background: blue;
}
```

### Event Handlers

AngularJS events should behave similarly to the [DOM event counterparts](https://developer.mozilla.org/en-US/docs/Web/Events). For detailed information and examples, visit https://docs.angularjs.org/api/ng/directive

#### Click Events

- `ng-click`
- `ng-dblclick`
- `ng-mousedown`
- `ng-mouseup`

#### Mouse Position Events

- `ng-mouseover`
- `ng-mouseenter`
- `ng-mouseleave`
- `ng-mousemove`

#### Keyboard Events

- `ng-keydown`
- `ng-keyup`
- `ng-keypress`

#### Form & Control Events

- `ng-submit`
- `ng-change` unlike DOM event `onchange`, is evaluated immediately (the latter only fires when the element loses focus).
- `ng-focus`
- `ng-blur`

> **Fun trivia:** DOM event [`oninput`](https://developer.mozilla.org/en-US/docs/Web/Events/input) triggers immediately after the value of an element has changed via user interaction, however does not work on `<select>` tag.

#### Clipboard Events

- `ng-copy`
- `ng-cut`
- `ng-paste`

#### Touchscreen Events

`angular-material` provides custom swipe gesture listeners. [Demo](https://material.angularjs.org/latest/demo/swipe)

- `md-swipe-down`
- `md-swipe-left`
- `md-swipe-right`
- `md-swipe-up`

However, if you are unable / do not want to use `angular-material` for some reason, you can use the official [`angular-touch`](https://www.npmjs.com/package/angular-touch) or the alternative [`angular-swipe`](https://www.npmjs.com/package/angular-swipe) to provide these gesture events:

- `ng-swipe-left`
- `ng-swipe-right`
- `ng-swipe-up` *
- `ng-swipe-down` *

> \* not available in `angular-touch`

### Transform Filters

#### Basic

All AngularJS filters, including `filter`, `orderBy`, and `limitTo` filters that we used for searching through a looped collection, are basically **[simple transform functions at their very cores](https://docs.angularjs.org/guide/filter)**.

This is an example of authoring a custom filter for incrementing an input number by one:

```ts
app.filter('add', function() {
    return function(input: number) {
        return input + 1;
    };
});
```

As simple as that. To use the filter, simply pipe your value to it:

```html
<p ng-bind="2 | add"></p>
```

We can add parameters to our `add` filter too:

```ts
app.filter('add', function () {
    return function (input: number, x: number) {
        if (x) {
            return input + x;
        }
        return input + 1;
    };
});
```

```html
<p ng-bind="2 | add:3"></p>
```

#### Advanced

If somehow you need to call in a service from the Dependency Injection provider, the usual [construction function via array notation](https://docs.angularjs.org/guide/di) works nicely here:

```ts
// Extra Knowledge: This is how you define application-wide settings / constants. 
app.value('jack', 100);

app.filter('add', ['jack', function (jack: number) {
    return function (input: number, x: number) {
        input += jack;
        if (x) {
            return input + x;
        }
        return input + 1;
    };
}]);
```

Normally, one or two simple filters defined in `angular-project.ts` would not be detrimental to source code structure. However, if there are gigantic complex filters or too many filters, the entry point would quickly become unreadable.

To mitigate this, add the following line in `angular-project.ts`:

```ts
import * as filters from './filters';
```

Then create a new folder `/filters` with `index.ts` inside:

```ts
export * from './Add';
```

Then create `Add.ts` next to the `index.ts`:

```ts
export let Add = ['jack', function (jack: number) {
    return function (input: number, x: number) {
        input += jack;
        if (x) {
            return input + x;
        }
        return input + 1;
    };
}];
```

Now functions required for running `Add.ts` are isolated into a single module, which allows clean separation and loose coupling with the rest of the application modules.

Return to `angular-project.ts` code lines where we registered `add` filter earlier. Replace the code with:

```ts
app.filter('add', filters.Add);
```

Looks better, aye?

#### Built-In Filters

- Refer to [loop filters section](#loop-filters) for `filter`, `orderBy`, and `limitTo` usage manual.

- [`number`](https://docs.angularjs.org/api/ng/filter/number) applies thousands separators and performs input rounding to the chosen fraction count (defaults to 3).

    - `1234.56789 | number:2` will be rendered as `1,234.57`.

- [`currency`](https://docs.angularjs.org/api/ng/filter/currency) works like `number` but displays a currency symbol (defaults to `$`).

    - `1234.56789 | currency:'Rp ':2` will be rendered as `Rp 1,234.57`.

- [`lowercase`](https://docs.angularjs.org/api/ng/filter/lowercase) and [`uppercase`](https://docs.angularjs.org/api/ng/filter/uppercase) converts a string input into lowercase or uppercase.

    - You should use CSS [`text-transform`](https://developer.mozilla.org/en/docs/Web/CSS/text-transform) property with `uppercase`, `lowercase`, or `capitalize` values instead for styling outputs, though...

- [`json`](https://docs.angularjs.org/api/ng/filter/json) stringifies any input object into JSON string. Provide parameter for specificying display indentation.

    - Practical usage example: `<pre><code ng-bind="debugging | json:4"></code></pre>`

    - `ng-bind` and `{{ }}` also automatically stringify an object passed to JSON, but not indented.

- [`date`](https://docs.angularjs.org/api/ng/filter/date) allows rendering a JavaScript [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) or [number representing Unix Time in milliseconds](https://en.wikipedia.org/wiki/Unix_time) or [ISO 8601 string](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString) object using requested format.

    - For example, but not limited to: `1499955043195 | date:'yyyy-MM-dd HH:mm:ss Z'` will be rendered as `2017-07-13 21:10:43 +0700`

    - The first filter parameter accepts the format string. Refer to the official documentation for a comprehensive usage manual.

    - The second filter parameter accepts time zone string. (e.g. `UTC`, `+0800` for 8h0m ahead of GMT)

### Behavior Mutations

Certain tags within AngularJS will behave differently compared to standard HTML:

- `<a>` will not cause page reload when `href` attribute is empty. This is needed for writing AngularJS application with client-side routing.

- `<form>` will not cause submission to server when `action` attribute is empty, due to the nature of AngularJS applications relying on AJAX for receiving / sending data from / to server.

## Server API

Before attempting the next section, prepare a web service endpoint that accepts two numbers then returns addition, subtraction, and multiplication results as JSON. Make sure that the API works by using [Postman](https://www.getpostman.com/).

As an example, this is a `POST /api/v1/math` API developed using ASP.NET Core MVC:

```cs
[Produces("application/json")]
[Route("api/v1/math")]
public class MathApiController : Controller
{
    public class MathApiRequestModel
    {
        public double A { set; get; }

        public double B { set; get; }
    }

    public class MathApiResponseModel
    {
        public double Sum { set; get; }

        public double Subtract { set; get; }

        public double Multiply { set; get; }
    }

    [HttpPost]
    public IActionResult Post([FromBody]MathApiRequestModel model)
    {
        var result = new MathApiResponseModel
        {
            Sum = model.A + model.B,
            Subtract = model.A - model.B,
            Multiply = model.A * model.B
        };

        return Ok(result);
    }
}
```

> It is always a good practice to version your APIs. That way, you can retain backwards compatibility during future development.

## Services

In `models/index.ts`, add the following code:

```ts
export class MathApiResponseModel {
    sum: number;
    subtract: number;
    multiply: number;
}
```

After that, in `services/index.ts`, add the following line:

```ts
export * from './MathService';
```

Create a new file `MathService.ts` in the same `services` folder:

```ts
import { MathApiResponseModel } from '../models';

export class MathService {
    static $inject = ['$http'];

    $http: angular.IHttpService;

    constructor($http) {
        this.$http = $http;
    }

    post(a: number, b: number) {
        return this.$http.post<MathApiResponseModel>('/api/v1/math', {
            a: a,
            b: b
        });
    }
}
```

Explanation:

- `constructor($http)` allows AngularJS to perform Dependency Injection via constructor parameter for HTTP Service required to perform request against a web API.

- `static $inject` allows injected services to survive mangling during compilation.
    - For example, `$http` parameter may turn into `h` after minification.
    - By providing a `static $inject` containing service names in an array of string, AngularJS will be able to correctly resolve the required dependencies.

- `post` method uses the HTTP Service to perform a request to a web API, which returns a `Promise<MathApiResponseModel>` object if successful.

To use the service via Dependency Injection, in `angular-project.ts`, add the following line:

```ts
app.service('MathService', services.MathService);
```

Then, modify our `SumController` in `SumComponent.ts`:

```ts
import { MathService } from '../services';

class SumController implements angular.IController {
    static $inject = ['MathService'];

    MathService: MathService;

    a: number;
    b: number;
    total: number;

    constructor(MathService) {
        this.MathService = MathService;
    }

    $onInit() {
    }

    submit() {
        this.MathService.post(this.a, this.b).then(response => {
            this.total = response.data.sum;
        }).catch(error => {
            console.log(error);
        });
    }
}
```

And our `Sum.html` to:

```html
<form ng-submit="me.submit()">
    <input ng-model="me.a" />
    <input ng-model="me.b" />
    <button type="submit">Submit</button>
    <p ng-bind="me.total"></p>
</form>
```

Explanation:

- `SumController` requires `MathService` dependency, used for posting the two numbers to the server and obtaining the result as `total` property. The `MathService` property is type-hinted for improved code quality.

- `MathService.post` returns a [$q](https://docs.angularjs.org/api/ng/service/$q) object, which is a [Promises/A+](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)-compliant implementation of deferred objects. HTTP requests are performed asynchronously, then handled using a series of callbacks when done / failed.

- Introduce UI for the component using a form, with two input box bound to `a` and `b` properties. When the form is submitted, invoke `submit()` method in the controller. Also, display the sum total.

## async-await

While manipulating `Promise` results using `then()` and `catch()` callbacks are possible, the controller methods can quickly become unreadable if the code contain multiple nested / chained Promises.

For this reason TypeScript and ECMAScript 8 supports async-await, which allows writing asynchronous code just like normal synchronous code. This concept is similar to [.NET Task Parallel Library using async-await](https://docs.microsoft.com/en-us/dotnet/csharp/async).

Modify the `submit()` method in `SumController` to:

```ts
async submit() {
    try {
        let response = await this.MathService.post(this.a, this.b);
        this.total = response.data.sum;
    } catch (error) {
        console.log(error);
    }
}
```

Explanation:

- `await` keyword can only be used in an `async` methods.

- `await` can only be performed against a `Promise` object. Successful `await` will unwrap the result of a completed `Promise`.

- Similar to synchronous code, `await` will throw an error if not successful. For this reason, try-catch block is required to prevent unhandled error when the request failed.

    - Instead of wrapping everything in a try-catch blocks, you can also do a global exception handling using [`window.onerror`](https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror) callback.

> **Under the hood:** Normally this technique does not work in AngularJS world because `$q` triggers `$scope.$apply()` but standard `Promise` does not. However, we can trick the browser into using `$q` as `Promise` polyfill by using the following code in `angular-project.ts`:

```ts
// This code has already been included by instapack AngularJS project templates!
app.run(['$q', ($q: angular.IQService) => {
    window['Promise'] = $q;
}]);
```

```json
// Add "es2015.promise" to "lib" in tsconfig.json, for source code access to Promise API.
"lib": [
    "dom",
    "es5",
    "es2015.promise"
]
```

## Validation

AngularJS provides basic implementation for common HTML5 input types and attributes for validation. However unlike ASP.NET Core MVC, it does not provide an out-of-the-box component for quickly displaying validation errors.

For this reason, a custom AngularJS input validation message component is provided within a project generated using instapack. The component usage is similar to `@Html.ValidationMessageFor` for ASP.NET Core MVC.

Modify `Sum.html` to:

```html
<form name="MyForm" ng-submit="MyForm.$valid && me.submit()">
    <div>
        <input name="A" ng-model="me.a" type="number" required />
        <validation-message for="MyForm.A" display="First number"></validation-message>
    </div>
    <div>
        <input name="B" ng-model="me.b" type="number" required />
        <validation-message for="MyForm.B" display="Second number"></validation-message>
    </div>
    <div>
        <button ng-disabled="MyForm.$invalid" type="submit">Submit</button>
    </div>
    <p ng-bind="me.total"></p>
</form>
```

Explanation:

- `<validation-message>` displays validation message for AngularJS standard input errors.

    - `for` attribute must be filled with `[<form> name].[<input> name]`.
    
    - The component will attempt automatic homing to the input tag using `getElementsByName` for parsing validation parameter values such as `min`, `max`, `minlength`, `maxlength`, and `pattern` for accurately displaying the error message.

    - `display` attribute customizes the name displayed for the input field.

    - `pattern-error` attribute may be filled for customizing error message due to `pattern` RegEx mismatch.

    - Error messages are wrapped in a `field-validation-error` class, like the Razor tag counterpart.

    - Read more about `ng-messages`, used within `validation-message` component: https://docs.angularjs.org/api/ngMessages/directive/ngMessages

- `MyForm.$valid` and `MyForm.$invalid` were used for disabling form submit and the submission button when one or more inputs have invalid values. 

    - Read more about AngularJS forms and validations: https://docs.angularjs.org/guide/forms

> **Warning:** Client-side validation cannot alone secure user input. Server side validation is also necessary.
