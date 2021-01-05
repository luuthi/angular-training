import {Injectable} from '@angular/core';
import {
  HttpRequest,
  HttpResponse,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import {Observable, of, throwError} from 'rxjs';
import {delay, mergeMap, materialize, dematerialize} from 'rxjs/operators';
import {createAccount, Account, ParamSearch, createParamSearch} from '../model/account.model';
import {UUID} from 'angular2-uuid';
import {Accounts} from '../data/account';
import {Users} from '../data/user';

// array in local storage for registered users
const users = JSON.parse(localStorage.getItem('users') as string) || Users;
let accountList = JSON.parse(localStorage.getItem('accountList') as string) || Accounts;

@Injectable()
export class FakeBackendInterceptor implements HttpInterceptor {
  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const {url, method, headers, body, params} = request;

    // wrap in delayed observable to simulate server api call
    return of(null)
      .pipe(mergeMap(handleRoute))
      // tslint:disable-next-line:max-line-length
      .pipe(materialize()) // call materialize and dematerialize to ensure delay even if an error is thrown (https://github.com/Reactive-Extensions/RxJS/issues/648)
      .pipe(delay(500))
      .pipe(dematerialize());

    // tslint:disable-next-line:typedef
    function handleRoute() {
      switch (true) {
        case url.endsWith('/users/login') && method === 'POST':
          return authenticate();
        case url.endsWith('/users/register') && method === 'POST':
          return register();
        case url.endsWith('/accounts') && method === 'GET':
          return getAccounts();
        case url.match(/\/accounts\/.+$/) && method === 'DELETE':
          return deleteAccount();
        case url.endsWith('accounts') && method === 'POST':
          return addAccount();
        case url.match(/\/accounts\/.+$/) && method === 'PUT':
          return editAccount();
        case url.match(/\/accounts\/.+$/) && method === 'GET':
          return getUserById();
        default:
          // pass through any requests not handled above
          return next.handle(request);
      }
    }

    // route functions

    // tslint:disable-next-line:typedef
    function authenticate() {
      const {username, password} = body;
      const user = users.find(
        (x: { username: any; password: any; }) => x.username === username && x.password === password
      );
      if (!user) {
        return error('Username or password is incorrect');
      }
      return ok({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        token: 'fake-jwt-token',
      });
    }

    // tslint:disable-next-line:typedef
    function register() {
      const user = body;

      if (users.find((x: { username: any; }) => x.username === user.username)) {
        return error('Username "' + user.username + '" is already taken');
      }

      user.id = users.length ? Math.max(...users.map((x: { id: any; }) => x.id)) + 1 : 1;
      users.push(user);
      localStorage.setItem('users', JSON.stringify(users));

      return ok(user);
    }

    // tslint:disable-next-line:typedef
    function getAccounts() {
      // if (!isLoggedIn()) {
      //   return unauthorized();
      // }
      let paramSearch: ParamSearch;
      paramSearch = createParamSearch({
        limit: parseInt(params.get('limit') || '10', 0),
        start: parseInt(params.get('start') || '0', 0),
        search: params.has('search') ? params.get('search') || '' : '',
      });
      const rs = accountList.filter((x: Account) => x.firstname.includes(paramSearch.search)
        || x.lastname.includes(paramSearch.search));
      if (rs.length < paramSearch.start) {
        return ok([]);
      }
      if (rs.length <= paramSearch.limit + paramSearch.start) {
        return ok([...rs].slice(paramSearch.start, rs.length));
      } else {
        return ok([...rs].slice(paramSearch.start, paramSearch.start + paramSearch.limit));
      }
    }

    // tslint:disable-next-line:typedef
    function getUserById() {
      // if (!isLoggedIn()) {
      //   return unauthorized();
      // }

      const rs = accountList.filter((x: Account) => x._id !== idFromUrl());
      return ok(rs);
    }

    // tslint:disable-next-line:typedef
    function addAccount() {
      // if (!isLoggedIn()) {
      //   return unauthorized();
      // }
      const account = body as Account;
      // validate account

      const newAccount = createAccount({
        account_number: account.account_number,
        address: account.address,
        firstname: account.firstname,
        age: account.age,
        balance: account.balance,
        city: account.city,
        email: account.email,
        employer: account.employer,
        gender: account.gender,
        lastname: account.lastname,
        state: account.state,
        _id: UUID.UUID(),
      });
      accountList.push(newAccount);
      return ok(newAccount._id);
    }

    // tslint:disable-next-line:typedef
    function editAccount() {
      // if (!isLoggedIn()) {
      //   return unauthorized();
      // }

      const account = body as Account;
      // validate account

      const rs = accountList.filter((x: Account) => x._id === idFromUrl());
      if (rs.length === 0) {
        return error('Not exist account with id: ' + idFromUrl());
      }

      const oldAccount = rs[0] as Account;

      // assign account to old account
      accountList.forEach((acc: Account) => {
        if (acc._id === oldAccount._id) {
          acc.account_number = account.account_number;
          acc.address = account.address;
          acc.firstname = account.firstname;
          acc.age = account.age;
          acc.balance = account.balance;
          acc.city = account.city;
          acc.email = account.email;
          acc.employer = account.employer;
          acc.gender = account.gender;
          acc.lastname = account.lastname;
          acc.state = account.state;
        }
      });
      return ok(oldAccount._id);
    }

    // tslint:disable-next-line:typedef
    function deleteAccount() {
      // if (!isLoggedIn()) {
      //   return unauthorized();
      // }

      accountList = accountList.filter((x: Account) => x._id !== idFromUrl());
      localStorage.setItem('accounts', JSON.stringify(accountList));
      return ok(idFromUrl());
    }

    // helper functions

    // tslint:disable-next-line:typedef
    function ok(bodyData: any) {
      return of(new HttpResponse({status: 200, body: bodyData}));
    }

    // tslint:disable-next-line:typedef
    function error(message: string) {
      return throwError({error: {message}});
    }

    // tslint:disable-next-line:typedef
    function unauthorized() {
      return throwError({status: 401, error: {message: 'Unauthorised'}});
    }

    // tslint:disable-next-line:typedef
    function isLoggedIn() {
      return headers.get('Authorization') === 'Bearer fake-jwt-token';
    }

    // tslint:disable-next-line:typedef
    function idFromUrl() {
      const urlParts = url.split('/');
      return urlParts[urlParts.length - 1];
    }
  }
}

export const fakeBackendProvider = {
  // use fake backend in place of Http service for backend-less development
  provide: HTTP_INTERCEPTORS,
  useClass: FakeBackendInterceptor,
  multi: true,
};
