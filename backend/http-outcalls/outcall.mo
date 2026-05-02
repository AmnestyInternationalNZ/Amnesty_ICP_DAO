import Blob "mo:base/Blob";
import Text "mo:base/Text";
import Debug "mo:base/Debug";
import Int "mo:base/Int";
import Time "mo:base/Time";
import Array "mo:base/Array";

module {
  public type Header = {
    name: Text;
    value: Text;
  };

  public type HttpMethod = {
    #get;
    #head;
    #post;
  };

  public type TransformationOutput = {
    status: Nat;
    body: Blob;
    headers: [Header];
  };

  public type TransformationInput = {
    context : Blob;
    response : TransformationOutput;
  };

  public type Transform = query TransformationInput -> async TransformationOutput;

  public type HttpRequestArgs = {
    url : Text;
    max_response_bytes : ?Nat64;
    headers : [Header];
    body : ?Blob;
    method : HttpMethod;
    transform : ?{
      function : Transform;
      context : Blob;
    };
    is_replicated : ?Bool;
  };

  let IC = actor "aaaaa-aa" : actor {
    http_request : HttpRequestArgs -> async TransformationOutput;
  };

  public func transform(input : TransformationInput) : TransformationOutput {
    let response = input.response;
    {
      response with headers = [];
    };
  };

  let httpRequestCycles = 231_000_000_000;

  public func httpGetRequest(url : Text, extraHeaders: [Header], transform : Transform) : async Text {
    let headers = Array.append(extraHeaders, [
      { name = "User-Agent"; value = "caffeine.ai" },
    ]);
    let http_request : HttpRequestArgs = {
      url = url;
      max_response_bytes = null;
      headers;
      body = null;
      method = #get;
      transform = ?{
        function = transform;
        context = Blob.fromArray([]);
      };
      is_replicated = ?false;
    };
    let httpResponse = await (with cycles = httpRequestCycles) IC.http_request(http_request);
    switch (Text.decodeUtf8(httpResponse.body)) {
      case (null) { Debug.trap("empty HTTP response") };
      case (?decodedResponse) { decodedResponse };
    };
  };

  public func httpPostRequest(url : Text, extraHeaders: [Header], body : Text, transform : Transform) : async Text {
    let headers = Array.append(extraHeaders, [
      { name = "User-Agent"; value = "caffeine.ai" },
      { name = "Idempotency-Key"; value = "Time-" # Int.toText(Time.now()) },
    ]);
    let requestBody = Text.encodeUtf8(body);
    let httpRequest : HttpRequestArgs = {
      url = url;
      max_response_bytes = null;
      headers;
      body = ?requestBody;
      method = #post;
      transform = ?{
        function = transform;
        context = Blob.fromArray([]);
      };
      is_replicated = ?false;
    };
    let httpResponse = await (with cycles = httpRequestCycles) IC.http_request(httpRequest);
    switch (Text.decodeUtf8(httpResponse.body)) {
      case (null) { Debug.trap("empty HTTP response") };
      case (?decodedResponse) { decodedResponse };
    };
  };
};
