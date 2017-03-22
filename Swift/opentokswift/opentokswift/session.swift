//
//  session.swift
//  opentokswift
//
//  Created by rpc on 27/03/15.
//  Copyright (c) 2015 tokbox. All rights reserved.
//
import Foundation
import opentokc
import opentokcbridge

public class Session
{
    var c_session: COpaquePointer = COpaquePointer.null()
    var c_session_wrapper: OTSSessionDelegate
    
    public init (apiKey: String, sessionId: String)
    {
        c_session_wrapper = OTSSessionDelegate()
        
        c_session = otc_session_new(
            apiKey.cStringUsingEncoding(NSUTF8StringEncoding)!,
            sessionId.cStringUsingEncoding(NSUTF8StringEncoding)!,
            c_session_wrapper.cCallbackWrapper())
    }
    
    public func connect(token: String)
    {
        otc_session_connect(c_session, token.cStringUsingEncoding(NSUTF8StringEncoding)!)
    }
    
    public func publish(publisher: Publisher)
    {
        otc_session_publish(c_session, publisher.cPusblisher())
    }
    
    public var onConnected : () -> () {
        get {
            return c_session_wrapper.connected
        }
        set {
            c_session_wrapper.connected = newValue
        }
    }
}

